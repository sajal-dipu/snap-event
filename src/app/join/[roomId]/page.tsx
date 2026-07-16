"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { roomService } from "@/services/RoomService";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/Card";
import { auth } from "@/lib/firebase/auth";
import { signInAnonymously } from "firebase/auth";
import { db } from "@/lib/firebase/firestore";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Camera, Calendar, MapPin, Sparkles, User, Mail, Phone, CheckCircle, ShieldAlert } from "lucide-react";
import { formatDate } from "@/utils/formatters";
import { toast } from "sonner";

export default function GuestJoinPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  // 1. Fetch Room details
  const { data: room, isLoading: isLoadingRoom, error: roomError } = useQuery({
    queryKey: ["room-details", roomId],
    queryFn: () => roomService.getById(roomId),
    enabled: !!roomId,
  });

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Check if guest has already joined this room
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const joined = localStorage.getItem(`guest-joined-${roomId}`);
      if (joined === "true") {
        router.push(`/room/${roomId}`);
      }
    }
  }, [roomId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!acceptedTerms) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    setIsSubmitting(true);
    try {
      let uid = auth.currentUser?.uid;

      // 1. If not authenticated, sign in anonymously
      if (!uid) {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      }

      // 2. Save guest details to Firestore under their own users document (to satisfy firestore.rules)
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        {
          uid,
          displayName: name.trim(),
          email: email.trim() || "",
          phone: phone.trim() || "",
          role: "guest",
          createdAt: serverTimestamp(),
          joinedRooms: {
            [roomId]: {
              joinedAt: new Date().toISOString(),
            },
          },
        },
        { merge: true }
      );

      // 3. Mark in localStorage
      localStorage.setItem(`guest-joined-${roomId}`, "true");
      localStorage.setItem("guest-name", name.trim());
      if (email.trim()) localStorage.setItem("guest-email", email.trim());
      if (phone.trim()) localStorage.setItem("guest-phone", phone.trim());

      toast.success("Welcome! You have successfully joined the event room.");
      
      // 4. Redirect to the room page
      router.push(`/room/${roomId}`);
    } catch (err: any) {
      console.error("Guest join failed:", err);
      toast.error(err?.message || "Failed to join event room. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRoom) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Loading Event Details...
          </p>
        </div>
      </PublicLayout>
    );
  }

  if (roomError || !room) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 gap-3">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center text-lg font-black">
            !
          </div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Invalid Event Code</h2>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            The event code is invalid, or the event room has been closed or archived by the photographer.
          </p>
        </div>
      </PublicLayout>
    );
  }

  const eventDateStr = room.eventDate
    ? formatDate(room.eventDate.toDate(), { dateStyle: "long" })
    : "Date TBD";

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 py-12 md:py-20 space-y-6 select-none">
        
        {/* Cover Image Banner (if available) */}
        {room.coverImage && (
          <div className="w-full h-32 rounded-3xl overflow-hidden border border-border bg-zinc-950 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={room.coverImage}
              alt={room.name}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary-foreground/10 px-2 py-0.5 rounded-full border border-primary/20 backdrop-blur-xs">
                Virtual Event Room
              </span>
            </div>
          </div>
        )}

        {/* Room Header Info */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
          <div className="space-y-1.5">
            {!room.coverImage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[9px] font-black uppercase text-primary tracking-wider mb-1">
                <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                Virtual Event Room
              </span>
            )}
            <h1 className="text-xl font-black text-foreground tracking-tight leading-tight">
              {room.name}
            </h1>
            <p className="text-xs text-zinc-550 font-semibold leading-relaxed">
              Photographer: <span className="text-foreground">{room.photographerName}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-border/60 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
              <span>{eventDateStr} {room.eventTime && `at ${room.eventTime}`}</span>
            </div>
            {room.eventLocation?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>{room.eventLocation.city}, {room.eventLocation.state}</span>
              </div>
            )}
          </div>
        </div>

        {/* Guest Form */}
        <Card className="bg-card border border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-extrabold text-sm text-foreground">Join Event Gallery</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Register as a guest to search, view, and retrieve photos from this event room.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Email Address <span className="text-muted-foreground/60 normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                  Mobile Number <span className="text-muted-foreground/60 normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/65 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Terms checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                  disabled={isSubmitting}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="accept-terms" className="text-[10px] text-muted-foreground leading-relaxed font-semibold cursor-pointer">
                  I consent to the processing of my facial features (selfie upload/camera) to matching and retrieve my photos from this event room, and accept the Terms of Service.
                </label>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !acceptedTerms}
                className="w-full h-11 rounded-xl text-xs font-black bg-primary hover:bg-primary/95 text-white gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    <span>Joining Event Room...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Join Room & Access Photos</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
