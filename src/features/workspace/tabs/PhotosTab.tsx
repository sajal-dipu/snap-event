"use client";

import * as React from "react";
import {
  FolderOpen,
  Star,
  Clock,
  Search,
  Grid,
  Menu,
  ChevronDown,
  Info,
  Calendar,
  CheckCircle,
  Play,
  Copy,
  Edit2,
  Trash2,
  Share2,
  MapPin,
  Check,
  ChevronLeft,
  XCircle,
  Plus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import GalleryToolbar from "@/features/gallery/components/GalleryToolbar";
import GalleryGrid from "@/features/gallery/components/GalleryGrid";
import BulkActionBar from "@/features/gallery/components/BulkActionBar";
import PhotoViewer from "@/features/gallery/components/PhotoViewer";
import type { VirtualRoom, Photo } from "@/types";

export interface PhotosTabProps {
  room: VirtualRoom;
  photos: Photo[];
  search: string;
  setSearch: (val: string) => void;
  viewMode: "grid" | "masonry" | "list";
  setViewMode: (val: "grid" | "masonry" | "list") => void;
  albumId: string | null;
  setAlbumId: (val: string | null) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  onlyFavorites: boolean;
  setOnlyFavorites: (val: boolean) => void;
  selectedIds: string[];
  handleSelectPhoto: (photoId: string, selected: boolean) => void;
  handleSelectAll: () => void;
  handleClearSelection: () => void;
  handleFavoriteSingle: (photo: any) => void;
  handleDeleteSingle: (photo: any) => void;
  handleRenameSingle: (photo: any) => void;
  handleMoveSingle: (photo: any, albumName: string | null) => void;
  viewerState: { isOpen: boolean; index: number };
  setViewerState: (state: { isOpen: boolean; index: number }) => void;
  isLoadingPhotos: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  handleBulkFavorite: () => void;
  handleBulkDelete: () => void;
  handleBulkMove: (albumName: string | null) => void;
  roomId: string;
  setActiveTab: (tab: any) => void;
}

export function PhotosTab({
  room,
  photos,
  search,
  setSearch,
  viewMode,
  setViewMode,
  albumId,
  setAlbumId,
  sortBy,
  setSortBy,
  onlyFavorites,
  setOnlyFavorites,
  selectedIds,
  handleSelectPhoto,
  handleSelectAll,
  handleClearSelection,
  handleFavoriteSingle,
  handleDeleteSingle,
  handleRenameSingle,
  handleMoveSingle,
  viewerState,
  setViewerState,
  isLoadingPhotos,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  handleBulkFavorite,
  handleBulkDelete,
  handleBulkMove,
  roomId,
  setActiveTab
}: PhotosTabProps) {

  console.log("Room ID:", roomId);
  console.log("Photos fetched:", photos.length);
  console.log("Photo data:", photos);

  return (
    <div className="space-y-6 relative min-h-[500px]">
      
      {/* Search & filters toolbar */}
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
        onManageAlbumsOpen={() => setActiveTab("albums")}
      />

      {/* Bulk action sticky overlay */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          totalCount={photos.length}
          onClearSelection={handleClearSelection}
          onSelectAll={handleSelectAll}
          onFavorite={handleBulkFavorite}
          onDelete={handleBulkDelete}
          onMoveToAlbum={handleBulkMove}
          albums={room.albums || []}
          selectedPhotos={photos.filter((p: any) => selectedIds.includes(p.id))}
        />
      )}

      {/* Main interactive photos render */}
      <GalleryGrid
        photos={photos}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onSelectPhoto={handleSelectPhoto}
        onFavorite={handleFavoriteSingle}
        onDelete={handleDeleteSingle}
        onRename={handleRenameSingle}
        onMove={handleMoveSingle}
        albums={room.albums || []}
        onView={(_, index) => setViewerState({ isOpen: true, index })}
        isLoading={isLoadingPhotos}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
      />

      {/* Fullscreen EXIF and location lightbox viewer */}
      {viewerState.isOpen && photos[viewerState.index] && (
        <PhotoViewer
          photo={photos[viewerState.index]}
          photos={photos}
          currentIndex={viewerState.index}
          onClose={() => setViewerState({ isOpen: false, index: 0 })}
          onNavigate={(index) => setViewerState({ isOpen: true, index })}
          onDelete={(photoId) => handleDeleteSingle(photos.find(p => p.id === photoId) || { id: photoId })}
          albums={room.albums || []}
          roomId={roomId}
        />
      )}

    </div>
  );
}
export default PhotosTab;
