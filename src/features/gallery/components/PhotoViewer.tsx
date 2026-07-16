"use client";

import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Download,
  Trash2,
  Info,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PhotoSidebar } from "./PhotoSidebar";
import { useToggleFavoriteMutation } from "../hooks/useGallery";
import { photoManagementService } from "../services/PhotoManagementService";

interface PhotoViewerProps {
  photo: any;
  photos: any[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDelete?: (photoId: string) => void;
  albums: string[];
  roomId: string;
}

export function PhotoViewer({
  photo,
  photos,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
  albums,
  roomId,
}: PhotoViewerProps) {
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [showSidebar, setShowSidebar] = React.useState(true);

  const toggleFavorite = useToggleFavoriteMutation(roomId);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        handlePrev();
      } else if (e.key === "ArrowRight" && currentIndex < photos.length - 1) {
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, photos.length]);

  // Record a view event when photo opens
  React.useEffect(() => {
    if (photo?.id) {
      photoManagementService.incrementViews(photo.id);
    }
    // Reset zoom on navigation
    resetZoom();
  }, [photo?.id]);

  function resetZoom() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  function handleNext() {
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale((s) => {
    const nextScale = Math.max(s - 0.5, 1);
    if (nextScale === 1) setPosition({ x: 0, y: 0 });
    return nextScale;
  });

  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Dragging / Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async () => {
    try {
      // Record download analytics
      await photoManagementService.incrementDownloads(photo.id);
      
      // Open Cloudinary secure url to download (attachment forced URL)
      const downloadUrl = photo.secureUrl.replace("/upload/", "/upload/fl_attachment/");
      window.open(downloadUrl, "_blank");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({
      photoId: photo.id,
      favorite: !photo.favorite,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col md:flex-row text-white select-none">
      {/* Lightbox Main Container */}
      <div className="flex-grow relative flex flex-col h-full overflow-hidden">
        {/* Top Controls Overlay */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-widest text-zinc-400 bg-black/40 px-3 py-1 rounded-full border border-white/10">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 md:gap-3">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-black/40 rounded-lg border border-white/10 p-0.5 mr-2">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={scale <= 1} className="h-8 w-8 hover:bg-white/10 text-white">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={resetZoom} disabled={scale === 1} className="h-8 w-8 hover:bg-white/10 text-white" title="Reset Zoom">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={scale >= 4} className="h-8 w-8 hover:bg-white/10 text-white">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Favorite */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className={`h-9 w-9 rounded-lg border hover:bg-white/10 ${
                photo.favorite
                  ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500/30"
                  : "bg-black/40 border-white/10 text-white"
              }`}
            >
              <Star className="h-4.5 w-4.5 fill-current" />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 text-white hover:bg-white/10"
            >
              <Download className="h-4.5 w-4.5" />
            </Button>

            {/* Delete (if creator) */}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(photo.id)}
                className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 text-red-400 hover:text-red-300 hover:bg-red-950/20"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            )}

            {/* Sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className={`h-9 w-9 rounded-lg border hover:bg-white/10 ${
                showSidebar ? "bg-primary border-primary text-white" : "bg-black/40 border-white/10 text-white"
              }`}
            >
              <Info className="h-4.5 w-4.5" />
            </Button>

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Fullscreen Photo Area */}
        <div
          className="flex-grow flex items-center justify-center p-4 relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {/* Photo element wrapper for zooming/panning */}
          <div
            className="transition-transform duration-100 ease-out select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              maxHeight: "90%",
              maxWidth: "90%",
            }}
            onDoubleClick={handleDoubleClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.largeUrl || photo.secureUrl || photo.asset?.url}
              alt={photo.fileName}
              className="max-h-[85vh] max-w-[85vw] object-contain pointer-events-none rounded shadow-2xl select-none"
              draggable="false"
            />
          </div>

          {/* Left Arrow Button */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 h-10 w-10 md:h-14 md:w-14 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all outline-none z-10"
            >
              <ChevronLeft className="h-5 w-5 md:h-8 md:w-8" />
            </button>
          )}

          {/* Right Arrow Button */}
          {currentIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 h-10 w-10 md:h-14 md:w-14 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all outline-none z-10"
            >
              <ChevronRight className="h-5 w-5 md:h-8 md:w-8" />
            </button>
          )}
        </div>
      </div>

      {/* Slide-out Sidebar Drawer */}
      {showSidebar && (
        <div className="h-1/3 md:h-full md:w-80 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800 text-white shrink-0">
          <PhotoSidebar
            photo={photo}
            roomId={roomId}
            albums={albums}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      )}
    </div>
  );
}
export default PhotoViewer;
