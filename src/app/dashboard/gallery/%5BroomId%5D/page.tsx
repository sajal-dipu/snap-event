"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import {
  useGalleryPhotos,
  useToggleFavoriteMutation,
  useSoftDeletePhotosMutation,
  useRenamePhotoMutation,
  useMovePhotosMutation
} from "@/features/gallery/hooks/useGallery";

// UI Components
import GalleryToolbar from "@/features/gallery/components/GalleryToolbar";
import GalleryGrid from "@/features/gallery/components/GalleryGrid";
import BulkActionBar from "@/features/gallery/components/BulkActionBar";
import PhotoViewer from "@/features/gallery/components/PhotoViewer";
import AlbumManager from "@/features/gallery/components/AlbumManager";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ImageIcon, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import type { VirtualRoom } from "@/types";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default function RoomGalleryPage({ params }: PageProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Unwrap routing params Promise
  const { roomId } = React.use(params);

  // States
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "masonry" | "list">("grid");
  const [albumId, setAlbumId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState("newest");
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);

  // Selection states
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Dialog modals states
  const [isAlbumManagerOpen, setIsAlbumManagerOpen] = React.useState(false);
  const [viewerState, setViewerState] = React.useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch target room details
  const { data: room, isLoading: isLoadingRoom } = useQuery<VirtualRoom | null>({
    queryKey: ["virtual-room-details", roomId],
    queryFn: () => roomService.getById(roomId),
    enabled: !!roomId,
  });

  // Security check: verify photographer ownership
  React.useEffect(() => {
    if (room && user && room.photographerId !== user.uid) {
      toast.error("Unauthorized: You do not own this Event Room");
      router.push("/dashboard/gallery");
    }
  }, [room, user, router]);

  // Fetch photos
  const {
    data: photosData,
    isLoading: isLoadingPhotos,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGalleryPhotos(
    roomId,
    {
      albumId,
      favorite: onlyFavorites,
      search: debouncedSearch,
      sortBy,
    },
    30
  );

  const photos = photosData?.pages.flatMap((page: any) => page.data) || [];

  // Mutations
  const toggleFavorite = useToggleFavoriteMutation(roomId);
  const softDelete = useSoftDeletePhotosMutation(roomId, user?.uid || "");
  const renamePhoto = useRenamePhotoMutation(roomId);
  const movePhotos = useMovePhotosMutation(roomId);

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

  // Operations
  const handleFavoriteSingle = (photo: any) => {
    toggleFavorite.mutate({ photoId: photo.id, favorite: !photo.favorite });
  };

  const handleDeleteSingle = (photo: any) => {
    if (confirm(`Move "${photo.fileName}" to trash bin?`)) {
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

  // Bulk
  const handleBulkFavorite = () => {
    const selectedPhotos = photos.filter((p) => selectedIds.includes(p.id));
    const allFav = selectedPhotos.every((p) => p.favorite);
    const targetState = !allFav;

    selectedIds.forEach((id) => {
      toggleFavorite.mutate({ photoId: id, favorite: targetState });
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

  if (isLoadingRoom) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading Event Gallery...</p>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  if (!room) {
    return (
      <PhotographerDashboardLayout>
        <div className="text-center py-32 space-y-4">
          <h3 className="font-extrabold text-foreground">Event Room Not Found</h3>
          <Link href="/dashboard/gallery">
            <Button variant="outline">Back to Gallery</Button>
          </Link>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  const selectedPhotosList = photos.filter((p) => selectedIds.includes(p.id));

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/gallery">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800">
              <ChevronLeft className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight select-none">
              {room.name} Gallery
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse and manage photos specifically uploaded for {room.eventType} on {new Date(room.eventDate.seconds * 1000).toLocaleDateString()}.
            </p>
          </div>
        </div>

        {/* Gallery Toolbar */}
        <GalleryToolbar
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          albumId={albumId}
          onAlbumIdChange={setAlbumId}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onlyFavorites={onlyFavorites}
          onOnlyFavoritesChange={setOnlyFavorites}
          albums={room.albums || []}
          roomId={roomId}
          onManageAlbumsOpen={() => setIsAlbumManagerOpen(true)}
        />

        {/* Photos Grid */}
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
          albums={room.albums || []}
          isLoading={isLoadingPhotos}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
        />

        {/* Bulk Action Drawer */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={photos.length}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onMoveToAlbum={handleBulkMove}
          albums={room.albums || []}
          selectedPhotos={selectedPhotosList}
        />

        {/* Photo Lightbox */}
        {viewerState.isOpen && photos[viewerState.index] && (
          <PhotoViewer
            photo={photos[viewerState.index]}
            photos={photos}
            currentIndex={viewerState.index}
            onClose={() => setViewerState({ isOpen: false, index: 0 })}
            onNavigate={(index) => setViewerState((prev) => ({ ...prev, index }))}
            onDelete={handleDeleteSingle}
            albums={room.albums || []}
            roomId={roomId}
          />
        )}

        {/* Custom Albums Manager */}
        <AlbumManager
          isOpen={isAlbumManagerOpen}
          onClose={() => setIsAlbumManagerOpen(false)}
          room={room}
        />
      </div>
    </PhotographerDashboardLayout>
  );
}
