"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Star,
  Download,
  Trash2,
  Maximize2,
  Copy,
  FolderSymlink,
  Edit,
  Eye,
  FileText,
  Calendar,
  MoreVertical,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatDate } from "@/utils/formatters";
import { toast } from "sonner";

interface GalleryCardProps {
  photo: any;
  viewMode: "grid" | "masonry" | "list";
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onFavorite: () => void;
  onDelete: () => void;
  onRename: () => void;
  onMove: (albumId: string | null) => void;
  onView: () => void;
  albums: string[];
}

export function GalleryCard({
  photo,
  viewMode,
  isSelected,
  onSelect,
  onFavorite,
  onDelete,
  onRename,
  onMove,
  onView,
  albums,
}: GalleryCardProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(photo.secureUrl);
      toast.success("Link copied to clipboard!");
      setShowDropdown(false);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open standard secure attachment link
    const downloadUrl = photo.secureUrl.replace("/upload/", "/upload/fl_attachment/");
    window.open(downloadUrl, "_blank");
    setShowDropdown(false);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const uploadDateStr = photo.uploadTime
    ? formatDate(photo.uploadTime.toDate(), { month: "short", day: "numeric", year: "2-digit" })
    : formatDate(new Date(), { month: "short", day: "numeric", year: "2-digit" });

  const resolutionStr = `${photo.width}x${photo.height}`;

  // ─── 1. GRID / MASONRY VIEW CARD ───────────────────────────────────────
  if (viewMode === "grid" || viewMode === "masonry") {
    const isMasonry = viewMode === "masonry";
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        className={isMasonry ? "mb-4" : "aspect-square"}
      >
        <div
          className={`group relative rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 select-none h-full w-full ${
            isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
          }`}
        >
          {/* Selection Checkbox (always visible if selected, else shows on card hover) */}
          <div
            className={`absolute top-3 left-3 z-10 transition-opacity duration-200 ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox checked={isSelected} onChange={(e) => onSelect(e.target.checked)} className="border-white/40 bg-black/60 data-[state=checked]:bg-primary h-5 w-5 rounded-md" />
          </div>

          {/* Thumbnail Image */}
          <div
            onClick={onView}
            className={`relative w-full h-full cursor-pointer overflow-hidden ${
              isMasonry ? "min-h-[120px] max-h-[360px]" : "h-full"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl || photo.secureUrl || photo.asset?.url}
              alt={photo.fileName}
              className={`w-full rounded-xl ${
                isMasonry ? "h-auto object-contain" : "h-full object-cover"
              } bg-zinc-950/20 group-hover:scale-[1.02] transition-transform duration-300 ease-out`}
              loading="lazy"
            />

            {/* Hover Overlay Details */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5 text-white">
              {/* Top row - Spacer */}
              <div />

              {/* Middle row - View metrics */}
              <div className="flex items-center justify-center gap-4 text-xs font-semibold py-6">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {photo.viewCount || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {photo.downloadCount || 0}
                </span>
              </div>

              {/* Bottom Info bar */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="overflow-hidden flex-grow">
                  <p className="text-[11px] font-bold truncate leading-snug">{photo.fileName}</p>
                  <p className="text-[9px] text-zinc-300 font-mono flex items-center gap-1.5 mt-0.5 leading-none">
                    {formatBytes(photo.fileSize)} • {resolutionStr}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Favorite */}
                  <button
                    onClick={onFavorite}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center border hover:bg-white/10 ${
                      photo.favorite
                        ? "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                        : "bg-black/40 border-white/10 text-white"
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${photo.favorite ? "fill-current" : ""}`} />
                  </button>

                  {/* More Dropdown trigger */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="h-7 w-7 rounded-lg bg-black/40 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 bottom-8 z-20 w-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl py-1 text-xs font-semibold text-zinc-300">
                        <button onClick={handleDownload} className="w-full text-left px-3 py-2 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                        <button onClick={handleCopyLink} className="w-full text-left px-3 py-2 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                          <Copy className="h-3.5 w-3.5" /> Copy Link
                        </button>
                        <button onClick={onRename} className="w-full text-left px-3 py-2 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                          <Edit className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-zinc-900 hover:text-red-400 text-red-500 flex items-center gap-2 border-t border-zinc-900 mt-1 pt-1.5">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── 2. LIST VIEW ROW CARD ─────────────────────────────────────────────
  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className="w-full"
    >
      <div
        className={`flex items-center gap-4 p-3 border border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/10 rounded-xl transition-all select-none ${
          isSelected ? "ring-1 ring-primary border-primary bg-primary/[0.02]" : ""
        }`}
      >
        <div className="shrink-0 flex items-center">
          <Checkbox checked={isSelected} onChange={(e) => onSelect(e.target.checked)} className="h-4.5 w-4.5 rounded-md" />
        </div>

        {/* Thumbnail */}
        <div
          onClick={onView}
          className="h-12 w-12 rounded-xl overflow-hidden border border-border shrink-0 bg-zinc-950 cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbnailUrl || photo.secureUrl || photo.asset?.url}
            alt={photo.fileName}
            className="h-full w-full object-cover rounded-xl"
            loading="lazy"
          />
        </div>

        {/* File name & Album */}
        <div className="flex-grow min-w-0 pr-2">
          <p onClick={onView} className="text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary">
            {photo.fileName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {photo.albumId ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                📁 {photo.albumId}
              </span>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded">
                Unassigned
              </span>
            )}
          </div>
        </div>

        {/* Upload Date */}
        <div className="hidden md:flex flex-col w-24 shrink-0 text-xs font-medium">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date
          </span>
          <span className="text-foreground mt-0.5">{uploadDateStr}</span>
        </div>

        {/* Resolution & Size */}
        <div className="hidden lg:flex flex-col w-28 shrink-0 text-xs font-medium font-mono">
          <span className="text-muted-foreground flex items-center gap-1 font-sans">
            <FileText className="h-3.5 w-3.5" /> Dimensions
          </span>
          <span className="text-foreground mt-0.5">
            {resolutionStr} ({formatBytes(photo.fileSize)})
          </span>
        </div>

        {/* Views / Downloads */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground font-semibold">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {photo.viewCount || 0}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {photo.downloadCount || 0}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={onFavorite}
          className={`h-8 w-8 rounded-lg shrink-0 border flex items-center justify-center transition-all ${
            photo.favorite
              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
              : "border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          <Star className={`h-4 w-4 ${photo.favorite ? "fill-current" : ""}`} />
        </button>

        {/* Action Menu */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDropdown(!showDropdown)}
            className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>

          {showDropdown && (
            <div className="absolute right-0 top-9 z-20 w-40 bg-card border border-border rounded-xl shadow-xl py-1 text-xs font-semibold text-foreground">
              <button onClick={handleDownload} className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
                <Download className="h-3.5 w-3.5 text-muted-foreground" /> Download
              </button>
              <button onClick={handleCopyLink} className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
                <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copy Link
              </button>
              <button onClick={onRename} className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2">
                <Edit className="h-3.5 w-3.5 text-muted-foreground" /> Rename
              </button>
              <button onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 flex items-center gap-2 border-t border-border mt-1 pt-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
export default GalleryCard;
