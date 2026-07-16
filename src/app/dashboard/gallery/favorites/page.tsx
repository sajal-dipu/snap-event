"use client";

import * as React from "react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePhotographerFavorites,
  useToggleFavoriteMutation,
  useSoftDeletePhotosMutation,
  useRenamePhotoMutation,
  useMovePhotosMutation
} from "@/features/gallery/hooks/useGallery";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, Star, Heart } from "lucide-react";
import Link from "next/link";

// UI Components
import GalleryGrid from "@/features/gallery/components/GalleryGrid";
import PhotoViewer from "@/features/gallery/components/PhotoViewer";
import BulkActionBar from "@/features/gallery/components/BulkActionBar";

export default function GalleryFavoritesPage() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = React.useState<"grid" | "masonry" | "list">("grid");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [viewerState, setViewerState] = React.useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  // Fetch all favorites across rooms
  const {
    data: favoritesData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = usePhotographerFavorites(user?.uid || "", 30);

  const photos = favoritesData?.pages.flatMap((page: any) => page.data) || [];

  const toggleFavorite = useToggleFavoriteMutation();
  const softDelete = useSoftDeletePhotosMutation("", user?.uid || ""); // roomId empty, custom handle if needed
  const renamePhoto = useRenamePhotoMutation("");
  const movePhotos = useMovePhotosMutation("");

  const handleSelectPhoto = (photoId: string, selected: boolean) => {
    if (selected) {
      setSelectedIds((prev) => [...prev, photoId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== photoId));
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(photos.map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleFavoriteSingle = (photo: any) => {
    toggleFavorite.mutate({ photoId: photo.id, favorite: !photo.favorite });
  };

  const handleDeleteSingle = (photo: any) => {
    if (confirm(`Move "${photo.fileName}" to trash bin?`)) {
      // In favorites view, softdelete requires the specific photo's roomId
      softDelete.mutate([photo.id]);
    }
  };

  const handleRenameSingle = (photo: any) => {
    const newName = prompt("Rename File:", photo.fileName);
    if (newName && newName.trim() && newName.trim() !== photo.fileName) {
      renamePhoto.mutate({ photoId: photo.id, newName: newName.trim() });
    }
  };

  const handleMoveSingle = (photo: any, albumName: string | null) => {
    movePhotos.mutate({ photoIds: [photo.id], albumId: albumName });
  };

  const handleBulkFavorite = () => {
    selectedIds.forEach((id) => {
      toggleFavorite.mutate({ photoId: id, favorite: false }); // Unfavorite bulk
    });
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (confirm(`Move all ${selectedIds.length} selected photos to trash?`)) {
      softDelete.mutate(selectedIds, {
        onSuccess: () => setSelectedIds([]),
      });
    }
  };

  const handleBulkMove = (albumName: string | null) => {
    movePhotos.mutate(
      { photoIds: selectedIds, albumId: albumName },
      { onSuccess: () => setSelectedIds([]) }
    );
  };

  const selectedPhotosList = photos.filter((p) => selectedIds.includes(p.id));

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header navigation bar */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/gallery">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800">
              <ChevronLeft className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Favorite Starred Photos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse your favorite photographs compiled across all event rooms.
            </p>
          </div>
        </div>

        {/* Info header card */}
        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
          <Heart className="h-4.5 w-4.5 shrink-0 mt-0.5 fill-current animate-pulse" />
          <div>
            <p className="uppercase tracking-wider text-[10px] font-bold">Favorites Curated</p>
            <p className="mt-0.5 font-medium">
              Starred photos are marked for fast access during showcase selections. Unstarring an image immediately removes it from this view.
            </p>
          </div>
        </div>

        {/* View Mode Toolbar togglers */}
        {photos.length > 0 && (
          <div className="flex justify-between items-center bg-card border border-border rounded-xl p-3.5 shadow-sm">
            <span className="text-xs font-bold text-muted-foreground">
              Showing {photos.length} favorite {photos.length === 1 ? "photo" : "photos"}
            </span>

            {/* Layout selectors */}
            <div className="flex items-center gap-1.5">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 text-xs font-bold rounded-lg px-3"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === "masonry" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("masonry")}
                className="h-8 text-xs font-bold rounded-lg px-3"
              >
                Masonry
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 text-xs font-bold rounded-lg px-3"
              >
                List
              </Button>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-border rounded-3xl bg-card/40">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border flex items-center justify-center text-zinc-400">
              <Star className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">No Favorites Starred Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mx-auto font-medium">
                Open any virtual room gallery workspace and click the star icon to add photographs to this collections section.
              </p>
            </div>
          </div>
        ) : (
          <GalleryGrid
            photos={photos}
            viewMode={viewMode}
            selectedIds={selectedIds}
            onSelectPhoto={handleSelectPhoto}
            onFavorite={handleFavoriteSingle}
            onDelete={handleDeleteSingle}
            onRename={handleRenameSingle}
            onMove={handleMoveSingle}
            onView={(_, index) => setViewerState({ isOpen: true, index })}
            albums={[]} // empty albums list for global favorites view
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={fetchNextPage}
          />
        )}

        {/* Bulk Actions Menu bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={photos.length}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onMoveToAlbum={handleBulkMove}
          albums={[]}
          selectedPhotos={selectedPhotosList}
        />

        {/* Immersive lightbox */}
        {viewerState.isOpen && photos[viewerState.index] && (
          <PhotoViewer
            photo={photos[viewerState.index]}
            photos={photos}
            currentIndex={viewerState.index}
            onClose={() => setViewerState({ isOpen: false, index: 0 })}
            onNavigate={(index) => setViewerState((prev) => ({ ...prev, index }))}
            onDelete={handleDeleteSingle}
            albums={[]}
            roomId=""
          />
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
