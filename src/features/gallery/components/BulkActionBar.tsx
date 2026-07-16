"use client";

import * as React from "react";
import {
  Trash2,
  Star,
  FolderSymlink,
  Download,
  FileJson,
  X,
  CheckSquare,
  MinusSquare,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { toast } from "sonner";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onMoveToAlbum: (albumId: string | null) => void;
  albums: string[];
  selectedPhotos: any[];
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onClearSelection,
  onSelectAll,
  onFavorite,
  onDelete,
  onMoveToAlbum,
  albums,
  selectedPhotos,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const handleExportMetadata = () => {
    // Generate JSON file client-side
    const metadataList = selectedPhotos.map((p) => ({
      photoId: p.id,
      fileName: p.fileName,
      roomId: p.roomId,
      photographerId: p.photographerId,
      cloudinaryPublicId: p.cloudinaryPublicId,
      secureUrl: p.secureUrl,
      thumbnailUrl: p.thumbnailUrl,
      mediumUrl: p.mediumUrl,
      largeUrl: p.largeUrl,
      fileSize: p.fileSize,
      dimensions: `${p.width}x${p.height}`,
      aspectRatio: p.aspectRatio,
      exif: p.exif || null,
      tags: p.tags || [],
      favorite: p.favorite,
      viewCount: p.viewCount || 0,
      downloadCount: p.downloadCount || 0,
      uploadTime: p.uploadTime ? new Date(p.uploadTime.seconds * 1000).toISOString() : null,
    }));

    const blob = new Blob([JSON.stringify(metadataList, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `photo-metadata-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Open all images in separate download streams or new tabs
    selectedPhotos.forEach((photo) => {
      const downloadUrl = photo.secureUrl.replace("/upload/", "/upload/fl_attachment/");
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 3000);
    });
  };

  const handleCopyUrls = () => {
    try {
      const urls = selectedPhotos
        .map((p) => p.secureUrl || p.asset?.url || "")
        .filter(Boolean)
        .join("\n");
      
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(urls);
        toast.success(`Copied ${selectedCount} URLs to clipboard!`);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = urls;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success(`Copied ${selectedCount} URLs!`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy URLs");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl animate-in slide-in-from-bottom-6 duration-300">
      <div className="backdrop-blur-md bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white">
        {/* Left Stats Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X className="h-4.5 w-4.5" />
          </Button>

          <div>
            <p className="text-sm font-extrabold flex items-center gap-1.5 leading-none">
              {selectedCount} Selected
              <span className="text-[10px] text-zinc-500 font-medium font-mono">
                / {totalCount} total
              </span>
            </p>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {selectedCount < totalCount ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-zinc-900"
            >
              <CheckSquare className="h-4 w-4 mr-1.5" />
              Select All
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8 px-2.5 text-xs text-zinc-400 font-bold hover:bg-zinc-900"
            >
              <MinusSquare className="h-4 w-4 mr-1.5" />
              Deselect All
            </Button>
          )}
        </div>

        {/* Right Action Menu */}
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {/* Move to Album dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "disabled") {
                  onMoveToAlbum(val === "unassigned" ? null : val);
                  e.target.value = "disabled";
                }
              }}
              defaultValue="disabled"
              className="h-9 px-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-xs font-bold rounded-xl text-white select-none outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="disabled" disabled>
                📁 Move to Album
              </option>
              <option value="unassigned">Unassigned (General Gallery)</option>
              {albums.map((alb) => (
                <option key={alb} value={alb}>
                  {alb}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Favorite */}
          <Button
            variant="ghost"
            onClick={onFavorite}
            className="h-9 px-3.5 bg-zinc-900 border border-zinc-850 text-xs font-bold rounded-xl text-white hover:bg-zinc-850 gap-1.5"
          >
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            Favorite
          </Button>

          {/* Bulk Download */}
          <Button
            variant="ghost"
            onClick={handleDownloadAll}
            className="h-9 px-3.5 bg-zinc-900 border border-zinc-850 text-xs font-bold rounded-xl text-white hover:bg-zinc-850 gap-1.5"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          {/* Export JSON */}
          <Button
            variant="ghost"
            onClick={handleExportMetadata}
            className="h-9 px-3.5 bg-zinc-900 border border-zinc-850 text-xs font-bold rounded-xl text-white hover:bg-zinc-850 gap-1.5"
            title="Download metadata as JSON"
          >
            <FileJson className="h-4 w-4" />
            Export
          </Button>

          {/* Copy URLs */}
          <Button
            variant="ghost"
            onClick={handleCopyUrls}
            className="h-9 px-3.5 bg-zinc-900 border border-zinc-850 text-xs font-bold rounded-xl text-white hover:bg-zinc-850 gap-1.5"
            title="Copy all selected secure URLs"
          >
            <Copy className="h-4 w-4" />
            Copy URLs
          </Button>

          {/* Bulk Delete */}
          <Button
            variant="destructive"
            onClick={onDelete}
            className="h-9 px-3.5 text-xs font-extrabold rounded-xl gap-1.5 shadow-md shadow-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
export default BulkActionBar;
