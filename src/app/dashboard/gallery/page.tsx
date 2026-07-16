"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import type { VirtualRoom } from "@/types";

export default function GalleryPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Route room filter
  const roomIdParam = searchParams.get("roomId");

  // Query and filter states
  const [selectedRoomId, setSelectedRoomId] = React.useState<string>("");
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
  const [renameState, setRenameState] = React.useState<{ isOpen: boolean; photo: any }>({
    isOpen: false,
    photo: null,
  });

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 4000); // 400ms debounce
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch virtual rooms owned by photographer
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<VirtualRoom[]>({
    queryKey: ["gallery-rooms-dropdown", user?.uid],
    queryFn: () => (user?.uid ? roomService.listByPhotographer(user.uid) : []),
    enabled: !!user?.uid,
  });

  // Sync selected room ID
  React.useEffect(() => {
    if (roomIdParam) {
      setSelectedRoomId(roomIdParam);
    } else if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [roomIdParam, rooms, selectedRoomId]);

  const activeRoom = rooms.find((r) => r.id === selectedRoomId);

  // Fetch photos via React Query Infinite Scroll hook
  const {
    data: photosData,
    isLoading: isLoadingPhotos,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useGalleryPhotos(
    selectedRoomId,
    {
      albumId,
      favorite: onlyFavorites,
      search: debouncedSearch,
      sortBy,
    },
    30
  );

  // Flatten infinite query page data
  const photos = photosData?.pages.flatMap((page: any) => page.data) || [];

  // Mutations
  const toggleFavorite = useToggleFavoriteMutation(selectedRoomId);
  const softDelete = useSoftDeletePhotosMutation(selectedRoomId, user?.uid || "");
  const renamePhoto = useRenamePhotoMutation(selectedRoomId);
  const movePhotos = useMovePhotosMutation(selectedRoomId);

  // Selection callbacks
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

  // Card Operations
  const handleFavoriteSingle = (photo: any) => {
    toggleFavorite.mutate({
      photoId: photo.id,
      favorite: !photo.favorite,
    });
  };

  const handleDeleteSingle = (photo: any) => {
    if (confirm(`Move "${photo.fileName}" to the trash bin?`)) {
      softDelete.mutate([photo.id]);
    }
  };

  const handleRenameSingle = (photo: any) => {
    const newName = prompt("Enter a new file name:", photo.fileName);
    if (newName && newName.trim() && newName.trim() !== photo.fileName) {
      renamePhoto.mutate({
        photoId: photo.id,
        newName: newName.trim(),
      });
    }
  };

  const handleMoveSingle = (photo: any, albumName: string | null) => {
    movePhotos.mutate({
      photoIds: [photo.id],
      albumId: albumName,
    });
  };

  // Bulk Operations
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
    if (confirm(`Move all ${selectedIds.length} selected photos to the trash bin?`)) {
      softDelete.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
        },
      });
    }
  };

  const handleBulkMove = (albumName: string | null) => {
    movePhotos.mutate(
      {
        photoIds: selectedIds,
        albumId: albumName,
      },
      {
        onSuccess: () => {
          setSelectedIds([]);
        },
      }
    );
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRoomId = e.target.value;
    setSelectedRoomId(newRoomId);
    handleClearSelection();
    setAlbumId(null);
    setSearch("");
    // Update URL query parameters
    router.replace(`/dashboard/gallery?roomId=${newRoomId}`);
  };

  // Page Load States
  if (isLoadingRooms) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading virtual galleries...</p>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  if (rooms.length === 0) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border flex items-center justify-center text-zinc-400">
            <ImageIcon className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-foreground">No Event Rooms Created</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mx-auto">
              You must create an event room under rooms dashboard before accessing gallery photo management.
            </p>
          </div>
          <Link href="/dashboard/rooms">
            <Button className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10">
              Create Event Room
            </Button>
          </Link>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  const selectedPhotosList = photos.filter((p) => selectedIds.includes(p.id));

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">
        {/* Gallery Workspace Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight select-none">
              Photo Management
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload, sort, and distribute watermark-free photographs directly inside Cloudinary CDN namespaces.
            </p>
          </div>

          {/* Quick Room Selector Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-bold uppercase tracking-wider">Active Workspace:</span>
            <select
              value={selectedRoomId}
              onChange={handleRoomChange}
              className="h-10 border border-zinc-200 dark:border-zinc-800 bg-card rounded-xl px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              {rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} ({rm.eventType})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Gallery Filters & View Mode Selector */}
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
          albums={activeRoom?.albums || []}
          roomId={selectedRoomId}
          onManageAlbumsOpen={() => setIsAlbumManagerOpen(true)}
        />

        {/* Infinite Grid View Area */}
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
          albums={activeRoom?.albums || []}
          isLoading={isLoadingPhotos}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
        />

        {/* Floating Bulk Actions bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={photos.length}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onMoveToAlbum={handleBulkMove}
          albums={activeRoom?.albums || []}
          selectedPhotos={selectedPhotosList}
        />

        {/* Fullscreen Photo Lightbox */}
        {viewerState.isOpen && photos[viewerState.index] && (
          <PhotoViewer
            photo={photos[viewerState.index]}
            photos={photos}
            currentIndex={viewerState.index}
            onClose={() => setViewerState({ isOpen: false, index: 0 })}
            onNavigate={(index) => setViewerState((prev) => ({ ...prev, index }))}
            onDelete={handleDeleteSingle}
            albums={activeRoom?.albums || []}
            roomId={selectedRoomId}
          />
        )}

        {/* Album Tag Manager Modal */}
        {activeRoom && (
          <AlbumManager
            isOpen={isAlbumManagerOpen}
            onClose={() => setIsAlbumManagerOpen(false)}
            room={activeRoom}
          />
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
