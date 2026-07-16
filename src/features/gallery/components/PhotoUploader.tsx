"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud, Folder, File, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import { toast } from "sonner";
import type { VirtualRoom } from "@/types";

interface PhotoUploaderProps {
  onFilesSelected: (files: File[], roomId: string) => void;
  initialRoomId?: string | null;
}

export function PhotoUploader({ onFilesSelected, initialRoomId }: PhotoUploaderProps) {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedRoomId, setSelectedRoomId] = React.useState<string>("");
  const [isDragActive, setIsDragActive] = React.useState(false);

  // Fetch virtual rooms owned by this photographer
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<VirtualRoom[]>({
    queryKey: ["virtual-rooms-list", user?.uid],
    queryFn: () => (user?.uid ? roomService.listByPhotographer(user.uid) : []),
    enabled: !!user?.uid,
  });

  React.useEffect(() => {
    if (initialRoomId) {
      setSelectedRoomId(initialRoomId);
    } else if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [initialRoomId, rooms, selectedRoomId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  };

  const processSelectedFiles = (fileList: File[]) => {
    if (!selectedRoomId) {
      toast.error("Please select an Event Room first");
      return;
    }

    // Supported formats: JPEG, PNG, WEBP, HEIC
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "heic"];
    const validFiles = fileList.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isAllowedExt = allowedExtensions.includes(ext);
      const isAllowedMime =
        file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".heic");
      return isAllowedExt && isAllowedMime;
    });

    if (validFiles.length === 0) {
      toast.error("No valid image files found. Supports JPEG, PNG, WEBP, or HEIC.");
      return;
    }

    // Maximum 500 images per upload batch
    if (validFiles.length > 500) {
      toast.warning("Maximum batch limit is 500 images. Only the first 500 will be uploaded.");
      onFilesSelected(validFiles.slice(0, 500), selectedRoomId);
    } else {
      onFilesSelected(validFiles, selectedRoomId);
    }
  };

  const triggerFileBrowser = () => fileInputRef.current?.click();
  const triggerFolderBrowser = () => folderInputRef.current?.click();

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* 1. Room Selection Header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <ArrowRight className="h-4.5 w-4.5 text-primary" />
          Choose Event Destination
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider sm:w-32 shrink-0">
            Event Room
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            disabled={isLoadingRooms}
            className="w-full max-w-md h-10 border border-zinc-200 dark:border-zinc-800 bg-background rounded-xl px-3 text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
          >
            {isLoadingRooms ? (
              <option>Loading your event rooms...</option>
            ) : rooms.length === 0 ? (
              <option value="">No rooms available. Please create one.</option>
            ) : (
              rooms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} ({rm.eventType})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* 2. Drag & Drop Uploader Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileBrowser}
        className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-primary bg-primary/[0.03] scale-[1.005]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-card/60"
        }`}
      >
        {/* Hidden HTML Input tags */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/jpeg,image/png,image/webp,.heic"
          className="hidden"
        />

        {/* Directory attribute for folder select */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFileChange}
          multiple
          {...{ webkitdirectory: "true", directory: "true" }}
          className="hidden"
        />

        <div className="h-16 w-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border shadow-inner flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
          <UploadCloud className="h-8 w-8 text-primary animate-bounce" />
        </div>

        <h3 className="font-extrabold text-base text-foreground mt-4">
          Drag & drop photos here
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Supports JPEG, PNG, WEBP, and HEIC files. Maximum 500 images per batch.
        </p>

        {/* Browsing triggers */}
        <div className="flex items-center gap-3 mt-6" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={triggerFileBrowser}
            className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 rounded-xl px-4 gap-1.5"
          >
            <File className="h-4 w-4" />
            Browse Files
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={triggerFolderBrowser}
            className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-bold rounded-xl px-4 gap-1.5"
          >
            <Folder className="h-4 w-4 text-primary" />
            Upload Folder
          </Button>
        </div>
      </div>

      {/* 3. Notice box */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
        <div>
          <p className="uppercase tracking-wider text-[10px] font-bold">Cloudinary Storage Protection</p>
          <p className="mt-0.5 font-medium">
            All files are stored in high-performance Cloudinary CDN. Firestore only keeps secure metadata urls. Never store full image binaries in Firestore database collections.
          </p>
        </div>
      </div>
    </div>
  );
}
export default PhotoUploader;
