import * as React from "react";
import { Check, Eye, Maximize2, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MatchedPhotoInfo } from "../hooks/useAiMatching";

interface MatchGalleryProps {
  photos: MatchedPhotoInfo[];
  selectedPhotoIds: string[];
  onSelectToggle: (photoId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRequestDownload: () => void;
}

export function MatchGallery({
  photos,
  selectedPhotoIds,
  onSelectToggle,
  onSelectAll,
  onDeselectAll,
  onRequestDownload,
}: MatchGalleryProps) {
  const [activePhotoIndex, setActivePhotoIndex] = React.useState<number | null>(null);

  // Keyboard navigation for Lightbox
  React.useEffect(() => {
    if (activePhotoIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && activePhotoIndex > 0) {
        setActivePhotoIndex(activePhotoIndex - 1);
      } else if (e.key === "ArrowRight" && activePhotoIndex < photos.length - 1) {
        setActivePhotoIndex(activePhotoIndex + 1);
      } else if (e.key === "Escape") {
        setActivePhotoIndex(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhotoIndex, photos.length]);

  const activePhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-card">
        <div>
          <h3 className="text-sm font-black tracking-tight text-foreground uppercase">
            Your Matched Photos ({photos.length} found)
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">
            {selectedPhotoIds.length} of {photos.length} selected for download
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedPhotoIds.length < photos.length ? (
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
            disabled={selectedPhotoIds.length === 0}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/10 rounded-xl gap-1.5"
          >
            <Download className="h-4 w-4" />
            Request Download
          </Button>
        </div>
      </div>

      {/* 2. Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, idx) => {
          const isSelected = selectedPhotoIds.includes(photo.id);

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

              {/* Confidence Score Badge */}
              <div className="absolute top-3 right-3 z-10 bg-black/60 border border-white/10 rounded-full px-2 py-0.5 text-[8px] font-black font-mono text-white tracking-wider">
                {Math.round(photo.confidence * 100)}% MATCH
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

                {/* Hover overlay details */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="bg-white/95 text-zinc-950 font-extrabold text-[10px] uppercase tracking-wider rounded-xl px-3 py-1.5 flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" /> View Photo
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Fullscreen Lightbox Modal */}
      {activePhotoIndex !== null && activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center text-white select-none animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6">
            <span className="text-xs font-bold font-mono tracking-widest text-zinc-400 bg-black/40 px-3 py-1 rounded-full border border-white/10">
              {activePhotoIndex + 1} / {photos.length} • {Math.round(activePhoto.confidence * 100)}% similarity match
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
          <div className="w-full max-w-4xl px-4 flex items-center justify-between gap-4">
            {/* Left Navigate */}
            {activePhotoIndex > 0 ? (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
                className="h-12 w-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : (
              <div className="h-12 w-12" />
            )}

            {/* Image */}
            <div className="flex-grow flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.secureUrl}
                alt={activePhoto.fileName}
                className="max-h-[75vh] max-w-full object-contain rounded shadow-2xl animate-in zoom-in duration-300"
              />
            </div>

            {/* Right Navigate */}
            {activePhotoIndex < photos.length - 1 ? (
              <button
                onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
                className="h-12 w-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : (
              <div className="h-12 w-12" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default MatchGallery;
