"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { roomService } from "@/services/RoomService";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PrivacyNotice } from "@/features/gallery/components/PrivacyNotice";
import { SelfieUploader } from "@/features/gallery/components/SelfieUploader";
import { CameraCapture } from "@/features/gallery/components/CameraCapture";
import { FaceScanner } from "@/features/gallery/components/FaceScanner";
import { ProcessingLoader } from "@/features/gallery/components/ProcessingLoader";
import { MatchGallery } from "@/features/gallery/components/MatchGallery";
import { RequestDownloadButton } from "@/features/gallery/components/RequestDownloadButton";
import { useMatchSelfieMutation, type MatchedPhotoInfo } from "@/features/gallery/hooks/useAiMatching";
import { Camera, Upload, Shield, Calendar, MapPin, Sparkles, RefreshCw } from "lucide-react";
import { formatDate } from "@/utils/formatters";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/auth";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  // Session states
  const [guestUid, setGuestUid] = React.useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [selfieUploaded, setSelfieUploaded] = React.useState(false);
  const [selfieUrl, setSelfieUrl] = React.useState<string | null>(null);

  // Component View States
  const [hasConsented, setHasConsented] = React.useState(false);
  const [inputMode, setInputMode] = React.useState<"select" | "camera" | "upload">("select");
  const [selectedSelfie, setSelectedSelfie] = React.useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = React.useState<string | null>(null);
  
  // AI matching states
  const [processingStage, setProcessingStage] = React.useState<"detecting" | "aligning" | "embedding" | "matching" | "complete">("detecting");
  const [matchedPhotos, setMatchedPhotos] = React.useState<MatchedPhotoInfo[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = React.useState<string[]>([]);
  const [matchingDone, setMatchingDone] = React.useState(false);

  const matchSelfieMutation = useMatchSelfieMutation();

  // 1. Fetch Room details
  const { data: room, isLoading: isLoadingRoom, error: roomError } = useQuery({
    queryKey: ["room-details", roomId],
    queryFn: () => roomService.getById(roomId),
    enabled: !!roomId,
  });

  // Helper to load matched photo documents from root photos collection based on matched ids list
  const loadMatchedPhotos = async (photoIds: string[]) => {
    if (!photoIds || photoIds.length === 0) {
      setMatchedPhotos([]);
      return;
    }
    try {
      const docs = await Promise.all(
        photoIds.map(id => getDoc(doc(db, "photos", id)))
      );
      const fetchedPhotos = docs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() } as any));
      setMatchedPhotos(fetchedPhotos);
      setSelectedPhotoIds(fetchedPhotos.map((p: any) => p.id));
    } catch (err) {
      console.error("Failed to load matched photos:", err);
    }
  };

  // Restore/Initialize Guest Session Automatically
  React.useEffect(() => {
    if (isLoadingRoom || !room) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        let uid = user?.uid;
        if (!uid) {
          console.log("[RoomPage] Guest not logged in. Signing in anonymously...");
          const cred = await signInAnonymously(auth);
          uid = cred.user.uid;
        }

        console.log("[RoomPage] Guest session initialized:", uid);
        setGuestUid(uid);
        localStorage.setItem("guestRoomId", roomId);
        localStorage.setItem("guestUid", uid);

        // Fetch guestSession from Firestore
        const sessionRef = doc(db, "guestSessions", uid);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          if (sessionData.roomId === roomId) {
            setSelfieUploaded(!!sessionData.selfieUploaded);
            if (sessionData.selfieUploaded) {
              const url = sessionData.secureUrl || sessionData.selfie?.secureUrl || null;
              setSelfieUrl(url);
              setSelfiePreviewUrl(url);
              setMatchingDone(true);
              await loadMatchedPhotos(sessionData.matchedPhotos || []);
            }
          } else {
            // New room session needed for this guest
            await setDoc(sessionRef, {
              uid,
              roomId,
              joinedAt: serverTimestamp(),
              selfieUploaded: false,
              matchedPhotos: []
            }, { merge: true });
            setSelfieUploaded(false);
            setSelfieUrl(null);
          }
        } else {
          // Create new session document
          await setDoc(sessionRef, {
            uid,
            roomId,
            joinedAt: serverTimestamp(),
            selfieUploaded: false,
            matchedPhotos: []
          });
          setSelfieUploaded(false);
          setSelfieUrl(null);
        }
      } catch (err) {
        console.error("Failed to initialize guest session:", err);
        toast.error("Failed to initialize session. Please reload.");
      } finally {
        setSessionLoading(false);
      }
    });

    return () => unsubscribe();
  }, [roomId, room, isLoadingRoom]);

  // Create selfie URL preview for scanner visualization
  React.useEffect(() => {
    if (!selectedSelfie) {
      // If we restored from session, we don't clear the preview URL
      if (!selfieUrl) {
        setSelfiePreviewUrl(null);
      }
      return;
    }
    const url = URL.createObjectURL(selectedSelfie);
    setSelfiePreviewUrl(url);
    
    return () => URL.revokeObjectURL(url);
  }, [selectedSelfie, selfieUrl]);

  // Handle Selfie Input (File Upload or Camera Capture)
  const handleSelfieSelected = (file: File) => {
    setSelectedSelfie(file);
    triggerMatchingPipeline(file);
  };

  // Run the animated matching pipeline
  const triggerMatchingPipeline = async (file: File) => {
    setMatchingDone(false);
    setMatchedPhotos([]);
    setSelectedPhotoIds([]);
    
    // Animate stage loading speeds for premium user experience
    setProcessingStage("detecting");
    const t1 = setTimeout(() => setProcessingStage("aligning"), 800);
    const t2 = setTimeout(() => setProcessingStage("embedding"), 1800);
    const t3 = setTimeout(() => setProcessingStage("matching"), 2800);

    try {
      const uid = guestUid || auth.currentUser?.uid;
      if (!uid) throw new Error("No active guest session found.");

      // STEP 6: Upload selfie to Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `guest_selfies/${roomId}`);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload selfie to Cloudinary.");
      }

      const uploadResult = await uploadRes.json();
      const secureUrl = uploadResult.secure_url;
      const publicId = uploadResult.public_id;

      // Update Firestore document with selfie details
      const sessionRef = doc(db, "guestSessions", uid);
      await updateDoc(sessionRef, {
        selfieUploaded: true,
        secureUrl,
        publicId,
        selfie: { secureUrl, publicId }
      });

      setSelfieUploaded(true);
      setSelfieUrl(secureUrl);

      // STEP 7: AI matching
      const response = await matchSelfieMutation.mutateAsync({
        roomId,
        selfieFile: file,
      });

      // Save matched photo ids to Firestore document
      const matchedPhotoIds = (response.photos || []).map((p) => p.id);
      await updateDoc(sessionRef, {
        matchedPhotos: matchedPhotoIds
      });

      // Clear timers and finish
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setProcessingStage("complete");
      
      // Delay slightly for dramatic transition effect
      setTimeout(() => {
        setMatchedPhotos(response.photos || []);
        setSelectedPhotoIds((response.photos || []).map((p) => p.id));
        setMatchingDone(true);
      }, 500);

    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setSelectedSelfie(null);
      setSelfiePreviewUrl(null);
      toast.error(err?.message || "Failed to process matching pipeline.");
    }
  };

  const handleReset = async () => {
    setSelectedSelfie(null);
    setMatchedPhotos([]);
    setSelectedPhotoIds([]);
    setMatchingDone(false);
    setSelfieUploaded(false);
    setSelfieUrl(null);
    setSelfiePreviewUrl(null);
    setInputMode("select");

    // Clean up Firestore guestSession fields
    const uid = guestUid || auth.currentUser?.uid;
    if (uid) {
      const sessionRef = doc(db, "guestSessions", uid);
      await updateDoc(sessionRef, {
        selfieUploaded: false,
        secureUrl: null,
        publicId: null,
        selfie: null,
        matchedPhotos: []
      });
    }
  };

  // Selector handlers
  const handleSelectToggle = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(matchedPhotos.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedPhotoIds([]);
  };

  // Main Loading view
  if (isLoadingRoom || sessionLoading) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Loading Virtual Event Room...
          </p>
        </div>
      </PublicLayout>
    );
  }

  // Error view
  if (roomError || !room) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 gap-3">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center text-lg font-black">
            !
          </div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Room Not Found</h2>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            The event room code is invalid, has been closed, or is archived by the photographer.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-2 rounded-xl text-xs font-bold px-4">
            Retry
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const eventDateStr = room.eventDate
    ? formatDate(room.eventDate.toDate(), { dateStyle: "long" })
    : "Date TBD";

  const isClosed = room.status === "closed";

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-8 select-none">
        
        {/* 1. Event Hero Banner */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent pointer-events-none" />
          
          <div className="space-y-3.5 max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase text-primary tracking-wider">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Event Live Sharing Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
              {room.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-zinc-400" />
                {eventDateStr} {room.eventTime && `• ${room.eventTime}`}
              </span>
              {room.eventLocation?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  {room.eventLocation.city}, {room.eventLocation.state}
                </span>
              )}
            </div>
            
            <p className="text-xs text-zinc-500 font-medium leading-relaxed">
              Photographer: <strong className="text-foreground">{room.photographerName}</strong>
            </p>
          </div>

          <div className="shrink-0">
            <div className="flex flex-col items-center sm:items-end text-center sm:text-right gap-1 bg-zinc-50 dark:bg-zinc-900 border border-border p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Photos Shared</span>
              <span className="text-2xl font-black text-primary font-mono">{room.photoCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Closed warning */}
        {isClosed && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2.5 text-xs font-semibold">
            <Shield className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="uppercase tracking-wider text-[10px] font-bold">Event Room Closed</p>
              <p className="mt-0.5 font-medium">
                This event room is closed. Visitors can match their photos but downloads may require review by the photographer.
              </p>
            </div>
          </div>
        )}

        {/* 2. Privacy Consent Block */}
        {!hasConsented && (
          <div className="max-w-xl mx-auto">
            <PrivacyNotice onAccept={() => setHasConsented(true)} />
          </div>
        )}

        {/* 3. Interactive Selfie Upload / Camera capture area */}
        {hasConsented && !selectedSelfie && !matchingDone && (
          <div className="max-w-md mx-auto space-y-6">
            
            {inputMode === "select" && (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary mx-auto">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">Find Your Photos</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1 mx-auto leading-relaxed">
                    Take a live selfie or upload an existing photo. Our AI service will securely search this event room.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    onClick={() => setInputMode("camera")}
                    className="h-11 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 rounded-xl text-xs gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    Use Live Camera
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setInputMode("upload")}
                    className="h-11 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold rounded-xl text-xs gap-1.5"
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    Upload from Gallery
                  </Button>
                </div>
              </div>
            )}

            {inputMode === "camera" && (
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black tracking-tight text-foreground uppercase text-center">
                  Take Event Selfie
                </h4>
                <CameraCapture
                  onCapture={handleSelfieSelected}
                  onCancel={() => setInputMode("select")}
                />
              </div>
            )}

            {inputMode === "upload" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black tracking-tight text-foreground uppercase">
                    Upload Selfie Image
                  </h4>
                  <button
                    onClick={() => setInputMode("select")}
                    className="text-xs font-bold text-primary hover:underline outline-none"
                  >
                    Back
                  </button>
                </div>
                <SelfieUploader onFileSelected={handleSelfieSelected} />
              </div>
            )}

          </div>
        )}

        {/* 4. Scanning loader overlays */}
        {selectedSelfie && !matchingDone && (
          <div className="relative max-w-sm mx-auto">
            {selfiePreviewUrl && (
              <div className="relative aspect-square max-w-[240px] mx-auto overflow-hidden rounded-2xl border border-zinc-300 dark:border-zinc-800 mb-6 bg-zinc-950 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfiePreviewUrl}
                  alt="Selfie processing preview"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <FaceScanner active={matchSelfieMutation.isPending} />
              </div>
            )}
            
            <ProcessingLoader currentStage={processingStage} />
          </div>
        )}

        {/* 5. Match results page */}
        {matchingDone && (
          <div className="space-y-6">
            
            {/* Selfie Review Header */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border">
              <div className="flex items-center gap-3">
                {selfiePreviewUrl && (
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-border bg-zinc-950 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfiePreviewUrl}
                      alt="Selfie thumbnail"
                      className="h-full w-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-foreground">Selfie search active</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                    Event matched successfully
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change Selfie
              </Button>
            </div>

            {matchedPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-border rounded-3xl bg-card/40 max-w-md mx-auto">
                <div className="h-16 w-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-border flex items-center justify-center text-zinc-400">
                  <Sparkles className="h-7 w-7 text-zinc-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">No photos found yet.</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1 mx-auto leading-relaxed">
                    We could not find any photos matching your face in this event room. Please check if photos are still being processed or try another selfie.
                  </p>
                </div>
                <Button onClick={handleReset} className="rounded-xl text-xs font-bold px-4">
                  Try Again
                </Button>
              </div>
            ) : (
              <MatchGallery
                photos={matchedPhotos}
                selectedPhotoIds={selectedPhotoIds}
                onSelectToggle={handleSelectToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onRequestDownload={() => {}} // Handle inside RequestDownloadButton wrapper below
              />
            )}

            {/* Float action bar for download trigger */}
            {matchedPhotos.length > 0 && selectedPhotoIds.length > 0 && (
              <div className="fixed bottom-6 inset-x-4 z-40 flex justify-center pointer-events-none">
                <div className="pointer-events-auto bg-zinc-950 border border-zinc-800 p-4 rounded-3xl shadow-2xl flex items-center gap-4 text-white max-w-lg w-full justify-between animate-in slide-in-from-bottom duration-300">
                  <div className="pl-2">
                    <p className="text-xs font-extrabold">Ready to download</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-bold uppercase">
                      {selectedPhotoIds.length} of {matchedPhotos.length} photos selected
                    </p>
                  </div>
                  
                  <RequestDownloadButton
                    roomId={roomId}
                    photographerId={room.photographerId}
                    photoIds={selectedPhotoIds}
                    onSuccess={() => {
                      setSelectedPhotoIds([]);
                    }}
                  />
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </PublicLayout>
  );
}
export const dynamic = "force-dynamic";
