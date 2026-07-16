"use client";

import * as React from "react";
import {
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Star,
  Trash2,
  FolderPlus,
  UploadCloud,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

interface GalleryToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  viewMode: "grid" | "masonry" | "list";
  onViewModeChange: (mode: "grid" | "masonry" | "list") => void;
  albumId: string | null;
  onAlbumIdChange: (albumId: string | null) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onlyFavorites: boolean;
  onOnlyFavoritesChange: (fav: boolean) => void;
  albums: string[];
  roomId: string;
  onManageAlbumsOpen: () => void;
}

export function GalleryToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  albumId,
  onAlbumIdChange,
  sortBy,
  onSortByChange,
  onlyFavorites,
  onOnlyFavoritesChange,
  albums,
  roomId,
  onManageAlbumsOpen,
}: GalleryToolbarProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4 shadow-sm select-none">
      {/* Top Section: Search and Primary Actions */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-grow max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by file name or tags..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-background/50 focus-visible:ring-primary focus-visible:bg-background"
          />
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Create Album */}
          <Button
            variant="outline"
            size="sm"
            onClick={onManageAlbumsOpen}
            className="h-9 px-3.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 gap-1.5"
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            Manage Albums
          </Button>

          {/* View Trash */}
          <Link href="/dashboard/gallery/trash">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-red-500 hover:text-red-600 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Trash Bin
            </Button>
          </Link>

          {/* Upload Photos Link */}
          <Link href={`/dashboard/gallery/upload?roomId=${roomId}`}>
            <Button
              size="sm"
              className="h-9 px-4 text-xs font-extrabold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10 gap-1.5"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Photos
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Section: Layout and Filter Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-4">
        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Album Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold">Album:</span>
            <select
              value={albumId || "all"}
              onChange={(e) => {
                const val = e.target.value;
                onAlbumIdChange(val === "all" ? null : val);
              }}
              className="h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">All Photos</option>
              <option value="unassigned">Unassigned</option>
              {albums.map((alb) => (
                <option key={alb} value={alb}>
                  {alb}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="filename">File Name</option>
              <option value="largest">File Size</option>
              <option value="most_viewed">Most Popular</option>
              <option value="most_downloaded">Most Downloaded</option>
            </select>
          </div>

          {/* Favorite Toggle Filter */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOnlyFavoritesChange(!onlyFavorites)}
            className={`h-9 px-3.5 text-xs font-bold rounded-xl gap-1.5 border transition-all ${
              onlyFavorites
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20"
                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            <Star className={`h-4 w-4 ${onlyFavorites ? "fill-current" : ""}`} />
            Favorites Only
          </Button>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl border border-border p-1 self-start sm:self-auto shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => onViewModeChange("masonry")}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all font-bold text-[10px] ${
              viewMode === "masonry"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Masonry View"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => onViewModeChange("list")}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List View"
          >
            <List className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
export default GalleryToolbar;
