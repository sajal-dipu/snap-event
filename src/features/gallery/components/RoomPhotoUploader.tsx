"use client";

import * as React from "react";
import { UploadCloud, FileImage } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface RoomPhotoUploaderProps {
  onFilesSelected: (files: File[]) => void;
  existingPhotos: any[];
}

export function RoomPhotoUploader({ onFilesSelected, existingPhotos }: RoomPhotoUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

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
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

    const validFiles: File[] = [];
    const existingNames = new Set(
      existingPhotos.map((p) => p.fileName || p.originalFilename || "")
    );

    for (const file of fileList) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      
      // Validation 1: Format check
      if (!allowedExtensions.includes(ext)) {
        toast.error(`"${file.name}" rejected: Unsupported format (only JPG, JPEG, PNG, WEBP allowed).`);
        continue;
      }

      // Validation 2: Size check
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" rejected: Exceeds 20MB limit.`);
        continue;
      }

      // Validation 3: Duplicate check
      if (existingNames.has(file.name)) {
        toast.error(`"${file.name}" rejected: Already uploaded to this room.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Limit check: max 100 images per batch
    if (validFiles.length > 100) {
      toast.warning("Maximum batch limit is 100 images. Only the first 100 will be added.");
      onFilesSelected(validFiles.slice(0, 100));
    } else {
      onFilesSelected(validFiles);
    }
  };

  const triggerFileBrowser = () => fileInputRef.current?.click();

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-300">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileBrowser}
        className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-primary bg-primary/[0.03] scale-[1.002]"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 bg-card/60"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <div className="h-14 w-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border shadow-inner flex items-center justify-center text-zinc-400">
          <UploadCloud className="h-7 w-7 text-primary animate-pulse" />
        </div>

        <h3 className="font-extrabold text-sm text-foreground mt-4">
          Drag & drop photo files here, or click to browse
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
          Supports JPG, JPEG, PNG, and WEBP formats (Max 20MB per image, up to 100 images per upload).
        </p>

        <div className="flex items-center gap-3 mt-5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={triggerFileBrowser}
            className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 rounded-xl px-4 gap-1.5"
          >
            <FileImage className="h-4 w-4" />
            Browse Files
          </Button>
        </div>
      </div>
    </div>
  );
}
export default RoomPhotoUploader;
