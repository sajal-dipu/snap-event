"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { roomService } from "@/services/RoomService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Download,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  FileArchive,
  Eye,
  Check,
  Sparkles,
  Clock,
  X
} from "lucide-react";
import { toast } from "sonner";
import type { DownloadRequest, VirtualRoom } from "@/types";

export default function SecureDownloadPage() {
  const params = useParams();
  const token = params?.token as string;

  // Data States
  const [request, setRequest] = React.useState<DownloadRequest | null>(null);
  const [room, setRoom] = React.useState<VirtualRoom | null>(null);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  
  // UI States
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExpired, setIsExpired] = React.useState(false);
  const [isInvalid, setIsInvalid] = React.useState(false);

  // Lightbox preview state
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  // Load and validate request
  const validateSession = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // 1. Fetch request by token
      const req = await downloadRequestService.getByToken(token);
      if (!req) {
        setIsInvalid(true);
        return;
      }
      
      setRequest(req);

      // 2. Validate status and expiry
      const now = new Date();
      const expiresAt = req.downloadExpiresAt?.toDate();

      if (req.status === "expired" || (expiresAt && expiresAt < now)) {
        setIsExpired(true);
        if (req.status !== "expired") {
          await downloadRequestService.expire(req.id);
        }
        return;
      }

      if (req.status !== "approved") {
        setIsInvalid(true);
        return;
      }

      // 3. Fetch event room details
      const roomDoc = await roomService.getById(req.roomId);
      setRoom(roomDoc);

      // 4. Fetch approved photos
      const snaps = await Promise.all(
        req.approvedPhotoIds.map((id) => getDoc(doc(db, "photos", id)))
      );
      const matchedPhotos = snaps
        .filter((s) => s.exists())
        .map((s) => ({ id: s.id, ...(s.data() as any) }));

      setPhotos(matchedPhotos);
      // Select all by default
      setSelectedIds(matchedPhotos.map((p) => p.id));

    } catch (err) {
      console.error("Session validation error:", err);
      setIsInvalid(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Track download counts in background
  const triggerDownloadTracking = async () => {
    if (!request) return;
    try {
      await fetch("/api/gallery/track-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id }),
      });
    } catch (err) {
      console.error("Failed to track download analytics:", err);
    }
  };

  // Cloudinary Attachment Download Helper
  const downloadAsset = (secureUrl: string, fileName: string) => {
    if (!secureUrl) return;
    // Inject attachment transformation to trigger browser download
    const url = secureUrl.replace("/upload/", "/upload/fl_attachment/");
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "photo.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Handlers
  const handleDownloadSingle = (photo: any) => {
    const src = photo.secureUrl || photo.asset?.secureUrl;
    const name = photo.originalFilename || "photo.jpg";
    downloadAsset(src, name);
    triggerDownloadTracking();
    toast.success("Initiating photo download...");
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;
    
    toast.info(`Downloading ${selectedIds.length} photos sequentially...`);
    
    selectedIds.forEach((id, index) => {
      const p = photos.find((photo) => photo.id === id);
      if (!p) return;
      const src = p.secureUrl || p.asset?.secureUrl;
      const name = p.originalFilename || "photo.jpg";
      
      // Delay downloads to prevent browser blocking multiple downloads
      setTimeout(() => {
        downloadAsset(src, name);
        if (index === selectedIds.length - 1) {
          triggerDownloadTracking();
        }
      }, index * 800);
    });
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(photos.map((p) => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Loading view
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 gap-3">
        <LoadingSpinner className="h-8 w-8 text-primary" />
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
          Verifying download session credentials...
        </p>
      </div>
    );
  }

  // Invalid Link view
  if (isInvalid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 gap-4">
        <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Invalid Download Link</h2>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mx-auto">
            This secure session token is invalid, revoked, or belongs to another event room configuration.
          </p>
        </div>
      </div>
    );
  }

  // Expired Link view
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 gap-4">
        <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center">
          <Clock className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Download Link Expired</h2>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mx-auto">
            This temporary sharing link has expired. Approved links are restricted to temporary durations (24h, 48h, or 7 days) to enforce guest privacy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 md:py-20 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.02] to-transparent pointer-events-none" />
          
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase text-green-600 dark:text-green-400 tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Guest Access Active
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
              {room?.name || "Event Photos Ready"}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              Photographer: <span className="text-foreground font-bold">{room?.photographerName || "Studio Pro"}</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 border border-border p-4 rounded-2xl">
            <Calendar className="h-5 w-5 text-zinc-400" />
            <div className="text-left leading-tight">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Link Expires At</p>
              <p className="text-xs font-black text-foreground mt-0.5">
                {request?.downloadExpiresAt?.toDate().toLocaleDateString() || "Temporary"}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <button
              onClick={handleSelectAll}
              className="hover:text-foreground hover:underline"
            >
              Select All
            </button>
            <span>•</span>
            <button
              onClick={handleDeselectAll}
              className="hover:text-foreground hover:underline"
            >
              Deselect All
            </button>
            <span>•</span>
            <span>
              {selectedIds.length} of {photos.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ZIP Download button */}
            <a
              href={`/api/gallery/download-zip?token=${token}`}
              className="inline-flex h-10 items-center justify-center px-4 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md shadow-primary/10 gap-1.5 hover:opacity-95"
            >
              <FileArchive className="h-4.5 w-4.5" />
              Download ZIP Archive
            </a>

            {selectedIds.length > 0 && selectedIds.length < photos.length && (
              <Button
                onClick={handleDownloadSelected}
                variant="outline"
                className="h-10 text-xs font-bold rounded-xl border-zinc-200"
              >
                Download Selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {photos.map((photo, index) => {
            const isSelected = selectedIds.includes(photo.id);
            const src = photo.secureUrl || photo.asset?.secureUrl || photo.asset?.url;
            const thumb = src ? src.replace("/upload/", "/upload/c_limit,w_500,q_auto,f_auto/") : "";

            return (
              <div
                key={photo.id}
                className={`relative aspect-[3/2] rounded-2xl overflow-hidden border bg-zinc-900 group shadow-sm transition-all duration-300 ${
                  isSelected ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt={photo.originalFilename || "Approved event photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                />

                {/* Overlay card controls */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleSelect(photo.id)}
                    className={`h-6.5 w-6.5 border rounded-lg flex items-center justify-center bg-black/60 backdrop-blur-sm text-white ${
                      isSelected ? "bg-primary border-primary" : "border-white/30"
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                  </button>
                </div>

                <div className="absolute top-3 right-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownloadSingle(photo)}
                    className="h-6.5 w-6.5 border border-white/30 rounded-lg flex items-center justify-center bg-black/60 backdrop-blur-sm text-white hover:bg-primary hover:border-primary transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white truncate text-[10px] font-semibold bg-black/40 backdrop-blur-sm p-1.5 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.originalFilename}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Lightbox Modal */}
        {lightboxIndex !== null && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-in fade-in duration-200">
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative max-w-5xl max-h-[85vh] w-full p-4 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[lightboxIndex].secureUrl || photos[lightboxIndex].asset?.secureUrl}
                alt="Lightbox view"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
              />

              {/* Navigation arrows */}
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute left-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors text-lg font-bold"
                >
                  ‹
                </button>
              )}

              {lightboxIndex < photos.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors text-lg font-bold"
                >
                  ›
                </button>
              )}
            </div>

            {/* Bottom floating details */}
            <div className="absolute bottom-6 inset-x-0 text-center text-white/80 text-xs font-semibold">
              <p>{photos[lightboxIndex].originalFilename}</p>
              <button
                onClick={() => handleDownloadSingle(photos[lightboxIndex])}
                className="mt-2.5 inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                <Download className="h-4 w-4" /> Download Photo
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
export const dynamic = "force-dynamic";
