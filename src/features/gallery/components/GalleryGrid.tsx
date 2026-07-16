"use client";

import * as React from "react";
import { ImageIcon, Loader } from "lucide-react";
import { GalleryCard } from "./GalleryCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface GalleryGridProps {
  photos: any[];
  viewMode: "grid" | "masonry" | "list";
  selectedIds: string[];
  onSelectPhoto: (photoId: string, selected: boolean) => void;
  onFavorite: (photo: any) => void;
  onDelete: (photo: any) => void;
  onRename: (photo: any) => void;
  onMove: (photo: any, albumId: string | null) => void;
  onView: (photo: any, index: number) => void;
  albums: string[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

export function GalleryGrid({
  photos,
  viewMode,
  selectedIds,
  onSelectPhoto,
  onFavorite,
  onDelete,
  onRename,
  onMove,
  onView,
  albums,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: GalleryGridProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Setup IntersectionObserver for Infinite Scroll
  React.useEffect(() => {
    if (isLoading || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading skeleton layout
  if (isLoading && photos.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div key={idx} className="aspect-square rounded-xl border border-border bg-card overflow-hidden p-2 space-y-2">
            <Skeleton className="h-4/5 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 select-none">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-border shadow-inner">
          <ImageIcon className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-foreground">No photos found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Try adjusting your search query, selecting a different album filter, or upload new files to get started.
          </p>
        </div>
      </div>
    );
  }

  // ─── 1. GRID LAYOUT ────────────────────────────────────────────────────
  if (viewMode === "grid") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {photos.map((photo, index) => (
            <GalleryCard
              key={photo.id}
              photo={photo}
              viewMode="grid"
              isSelected={selectedIds.includes(photo.id)}
              onSelect={(selected) => onSelectPhoto(photo.id, selected)}
              onFavorite={() => onFavorite(photo)}
              onDelete={() => onDelete(photo)}
              onRename={() => onRename(photo)}
              onMove={(albumId) => onMove(photo, albumId)}
              onView={() => onView(photo, index)}
              albums={albums}
            />
          ))}
        </div>

        {/* Scroll Sentinel */}
        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && <Loader className="h-6 w-6 text-primary animate-spin" />}
        </div>
      </div>
    );
  }

  // ─── 2. MASONRY LAYOUT (CSS Columns Pinterest Style) ───────────────────
  if (viewMode === "masonry") {
    return (
      <div className="space-y-6">
        <div className="columns-2 gap-4 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 [column-fill:balance]">
          {photos.map((photo, index) => (
            <GalleryCard
              key={photo.id}
              photo={photo}
              viewMode="masonry"
              isSelected={selectedIds.includes(photo.id)}
              onSelect={(selected) => onSelectPhoto(photo.id, selected)}
              onFavorite={() => onFavorite(photo)}
              onDelete={() => onDelete(photo)}
              onRename={() => onRename(photo)}
              onMove={(albumId) => onMove(photo, albumId)}
              onView={() => onView(photo, index)}
              albums={albums}
            />
          ))}
        </div>

        {/* Scroll Sentinel */}
        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
          {isFetchingNextPage && <Loader className="h-6 w-6 text-primary animate-spin" />}
        </div>
      </div>
    );
  }

  // ─── 3. LIST LAYOUT ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        {photos.map((photo, index) => (
          <GalleryCard
            key={photo.id}
            photo={photo}
            viewMode="list"
            isSelected={selectedIds.includes(photo.id)}
            onSelect={(selected) => onSelectPhoto(photo.id, selected)}
            onFavorite={() => onFavorite(photo)}
            onDelete={() => onDelete(photo)}
            onRename={() => onRename(photo)}
            onMove={(albumId) => onMove(photo, albumId)}
            onView={() => onView(photo, index)}
            albums={albums}
          />
        ))}
      </div>

      {/* Scroll Sentinel */}
      <div ref={sentinelRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <Loader className="h-6 w-6 text-primary animate-spin" />}
      </div>
    </div>
  );
}
export default GalleryGrid;
