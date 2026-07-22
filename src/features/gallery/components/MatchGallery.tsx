import * as React from "react";
import { Check, Maximize2, X, ChevronLeft, ChevronRight, Download, ThumbsUp, ThumbsDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MatchedPhotoInfo } from "../hooks/useAiMatching";
import { useSubmitMatchFeedbackMutation } from "../hooks/useAiMatching";
import { toast } from "sonner";

interface MatchGalleryProps {
  photos: MatchedPhotoInfo[];
  selectedPhotoIds: string[];
  onSelectToggle: (photoId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRequestDownload: () => void;
  title?: string;
  roomId?: string;
  currentThreshold?: number;
  onThresholdChange?: (threshold: number) => void;
}

export function MatchGallery({
  photos,
  selectedPhotoIds,
  onSelectToggle,
  onSelectAll,
  onDeselectAll,
  onRequestDownload,
  title,
  roomId = "",
  currentThreshold = 0.92,
  onThresholdChange,

}: MatchGalleryProps) {
  const [activePhotoIndex, setActivePhotoIndex] = React.useState<number | null>(null);
  const [hiddenPhotoIds, setHiddenPhotoIds] = React.useState<string[]>([]);
  const [confirmedPhotoIds, setConfirmedPhotoIds] = React.useState<string[]>([]);
  
  const submitFeedbackMutation = useSubmitMatchFeedbackMutation();

  // Filter out photos marked as "not my photo"
  const visiblePhotos = React.useMemo(() => {
    return photos.filter((p) => !hiddenPhotoIds.includes(p.id));
  }, [photos, hiddenPhotoIds]);

  // Keyboard navigation for Lightbox
  React.useEffect(() => {
    if (activePhotoIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activePhotoIndex > 0) {
        setActivePhotoIndex(activePhotoIndex - 1);
      } else if (e.key === "ArrowRight" && activePhotoIndex < visiblePhotos.length - 1) {
        setActivePhotoIndex(activePhotoIndex + 1);
      } else if (e.key === "Escape") {
        setActivePhotoIndex(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, visiblePhotos.length]);

  const activePhoto = activePhotoIndex !== null ? visiblePhotos[activePhotoIndex] : null;

  const handleFeedback = (photoId: string, feedback: "this_is_me" | "not_my_photo", confidence: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    submitFeedbackMutation.mutate({
      photoId,
      roomId,
      feedback,
      confidenceScore: confidence,
    });

    if (feedback === "not_my_photo") {
      setHiddenPhotoIds((prev) => [...prev, photoId]);
      if (activePhotoIndex !== null) {
        setActivePhotoIndex(null);
      }
      toast.info("Photo removed from your matches.");
    } else {
      setConfirmedPhotoIds((prev) => [...prev, photoId]);
      toast.success("Confirmed: This photo is saved as your match!");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-card">
        <div>
          <h3 className="text-sm font-black tracking-tight text-foreground uppercase">
            {title || "Your Matched Photos"} ({visiblePhotos.length} found)
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">
            {selectedPhotoIds.filter(id => !hiddenPhotoIds.includes(id)).length} of {visiblePhotos.length} selected for download
          </p>
        </div>

        {/* Dynamic Similarity Threshold Controls */}
        {onThresholdChange && (
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-border p-1.5 rounded-xl">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 px-2">
              <SlidersHorizontal className="h-3 w-3 text-primary" /> Similarity Threshold:
            </span>
            {[0.85, 0.90, 0.92, 0.95].map((val) => (
              <button
                key={val}
                onClick={() => onThresholdChange(val)}
                className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${
                  currentThreshold === val
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {val === 0.92 ? "0.92 (Exact Match)" : val}
              </button>
            ))}
          </div>
        )}


        <div className="flex items-center gap-2">
          {selectedPhotoIds.length < visiblePhotos.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800"
            >
              Select All
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeselectAll}
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800"
            >
              Deselect All
            </Button>
          )}

          <Button
            size="sm"
            onClick={onRequestDownload}
            disabled={selectedPhotoIds.filter(id => !hiddenPhotoIds.includes(id)).length === 0}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/10 rounded-xl gap-1.5"
          >
            <Download className="h-4 w-4" />
            Request Download
          </Button>
        </div>
      </div>

      {/* 2. Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visiblePhotos.map((photo, idx) => {
          const isSelected = selectedPhotoIds.includes(photo.id);
          const isConfirmed = confirmedPhotoIds.includes(photo.id);
          const confScore = photo.confidencePercent || `${Math.round(photo.confidence * 100)}%`;

          return (
            <div
              key={photo.id}
              className={`group relative rounded-xl border border-border bg-card overflow-hidden aspect-square hover:shadow-md transition-all duration-300 select-none ${
                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
              }`}
            >
              {/* Checkbox Overlay */}
              <button
                onClick={() => onSelectToggle(photo.id)}
                className={`absolute top-3 left-3 z-10 h-6 w-6 rounded-md border flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-white"
                    : "bg-black/40 border-white/20 text-transparent hover:border-white/60"
                }`}
              >
                {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
              </button>

              {/* Confidence Score & Confirmed Badge */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                {isConfirmed && (
                  <span className="bg-green-600 border border-green-400 rounded-full px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                    Confirmed
                  </span>
                )}
                <div className="bg-black/70 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-0.5 text-[9px] font-black font-mono text-white tracking-wider shadow-sm">
                  {confScore} MATCH
                </div>
              </div>

              {/* View / Open Trigger */}
              <div
                onClick={() => setActivePhotoIndex(idx)}
                className="relative w-full h-full cursor-pointer overflow-hidden bg-zinc-950"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.fileName}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                  loading="lazy"
                />

                {/* Hover Action Overlay with User Feedback Buttons */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2.5 p-3">
                  <span className="bg-white/95 text-zinc-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl px-3 py-1.5 flex items-center gap-1 shadow-md">
                    <Maximize2 className="h-3 w-3" /> View Photo
                  </span>

                  {/* Feedback Action Buttons */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleFeedback(photo.id, "this_is_me", photo.confidence, e)}
                      title="This is me"
                      className="px-2.5 py-1 rounded-lg bg-green-600/90 hover:bg-green-600 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                    >
                      <ThumbsUp className="h-3 w-3" /> This is me
                    </button>
                    <button
                      onClick={(e) => handleFeedback(photo.id, "not_my_photo", photo.confidence, e)}
                      title="Not my photo"
                      className="px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-[9px] font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                    >
                      <ThumbsDown className="h-3 w-3" /> Not my photo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Fullscreen Lightbox Modal */}
      {activePhotoIndex !== null && activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between items-center text-white select-none animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="w-full h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
            <span className="text-xs font-bold font-mono tracking-widest text-zinc-300 bg-black/50 px-3.5 py-1.5 rounded-full border border-white/10">
              {activePhotoIndex + 1} / {visiblePhotos.length} • {activePhoto.confidencePercent || `${Math.round(activePhoto.confidence * 100)}%`} similarity match
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSelectToggle(activePhoto.id)}
                className={`h-9 w-9 rounded-lg border border-white/10 ${
                  selectedPhotoIds.includes(activePhoto.id)
                    ? "bg-primary border-primary text-white"
                    : "bg-black/40 text-white hover:bg-white/10"
                }`}
              >
                <Check className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePhotoIndex(null)}
                className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Photo Display */}
          <div className="w-full max-w-5xl px-4 flex-grow flex items-center justify-between gap-4">
            {/* Left Navigate */}
            {activePhotoIndex > 0 ? (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
                className="h-12 w-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white transition-colors shrink-0"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : (
              <div className="h-12 w-12 shrink-0" />
            )}

            {/* Image */}
            <div className="flex-grow flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.secureUrl}
                alt={activePhoto.fileName}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in duration-300"
              />
            </div>

            {/* Right Navigate */}
            {activePhotoIndex < visiblePhotos.length - 1 ? (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
                className="h-12 w-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white transition-colors shrink-0"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : (
              <div className="h-12 w-12 shrink-0" />
            )}
          </div>

          {/* Footer Bar with User Feedback Action */}
          <div className="w-full h-20 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-4 px-6 z-10">
            <span className="text-xs font-semibold text-zinc-400">Is this photo you?</span>
            <Button
              size="sm"
              onClick={() => handleFeedback(activePhoto.id, "this_is_me", activePhoto.confidence)}
              className="h-9 px-4 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl gap-1.5 shadow-md"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> This is me
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback(activePhoto.id, "not_my_photo", activePhoto.confidence)}
              className="h-9 px-4 text-xs font-bold border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl gap-1.5"
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Not my photo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default MatchGallery;
