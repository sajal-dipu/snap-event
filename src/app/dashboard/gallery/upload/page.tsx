"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { PhotoUploader } from "@/features/gallery/components/PhotoUploader";
import { UploadQueue } from "@/features/gallery/components/UploadQueue";
import { Button } from "@/components/ui/Button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function GalleryUploadPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Selected room preset from URL
  const roomIdParam = searchParams.get("roomId");

  // Selection states
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [targetRoomId, setTargetRoomId] = React.useState<string>("");

  const handleFilesSelected = (files: File[], roomId: string) => {
    setSelectedFiles(files);
    setTargetRoomId(roomId);
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setTargetRoomId("");
  };

  const handleUploadComplete = () => {
    // When upload batch is completed, redirect user to the gallery for that room
    setTimeout(() => {
      router.push(`/dashboard/gallery?roomId=${targetRoomId}`);
    }, 2000); // 2 seconds delay to allow them to review success/errors
  };

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/gallery">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-800"
            >
              <ChevronLeft className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight select-none">
              Professional Photo Uploader
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribute high-resolution photographs into Cloudinary CDN event room folders.
            </p>
          </div>
        </div>

        {/* Upload flow logic selector */}
        {selectedFiles.length === 0 ? (
          <PhotoUploader
            onFilesSelected={handleFilesSelected}
            initialRoomId={roomIdParam}
          />
        ) : (
          <UploadQueue
            files={selectedFiles}
            roomId={targetRoomId}
            onClear={handleClear}
            onUploadComplete={handleUploadComplete}
          />
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
