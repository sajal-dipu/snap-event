"use client";

import * as React from "react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTrashPhotos,
  useRestorePhotosMutation,
  usePermanentDeletePhotosMutation
} from "@/features/gallery/hooks/useGallery";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChevronLeft, Trash2, RotateCcw, AlertOctagon, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/utils/formatters";

export default function GalleryTrashPage() {
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [now] = React.useState(() => Date.now());

  // Fetch soft-deleted photos
  const { data: trashPhotos = [], isLoading, refetch } = useTrashPhotos(user?.uid || "");

  const restoreMutation = useRestorePhotosMutation(user?.uid || "");
  const permanentDeleteMutation = usePermanentDeletePhotosMutation(user?.uid || "");

  const handleSelect = (photoId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, photoId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== photoId));
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === trashPhotos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trashPhotos.map((p) => p.id));
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      const itemsToRestore = trashPhotos.filter((p) => selectedIds.includes(p.id));
      
      // Group restores by roomId to correctly invalidate counts
      const groups: Record<string, string[]> = {};
      itemsToRestore.forEach((item) => {
        if (!groups[item.roomId]) groups[item.roomId] = [];
        groups[item.roomId].push(item.id);
      });

      const restorePromises = Object.entries(groups).map(([roomId, photoIds]) =>
        restoreMutation.mutateAsync({ photoIds, roomId })
      );

      await Promise.all(restorePromises);
      setSelectedIds([]);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    if (
      confirm(
        `DANGER: Are you sure you want to permanently delete all ${selectedIds.length} selected photos? This action will permanently remove files from Cloudinary and CANNOT be undone.`
      )
    ) {
      try {
        const itemsToDelete = trashPhotos
          .filter((p) => selectedIds.includes(p.id))
          .map((p) => ({ id: p.id, cloudinaryPublicId: p.cloudinaryPublicId }));

        await permanentDeleteMutation.mutateAsync(itemsToDelete);
        setSelectedIds([]);
        refetch();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Helper: calculate days remaining in the 30-day retention window
  const getDaysRemaining = (deletedAt: any): number => {
    if (!deletedAt) return 30;
    
    // Check if Firestore Timestamp
    const deletedTime = deletedAt.seconds
      ? deletedAt.seconds * 1000
      : new Date(deletedAt).getTime();
    
    const diffMs = now - deletedTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const remaining = 30 - diffDays;
    return Math.max(0, remaining);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 select-none">
        {/* Header navigation bar */}
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
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Trash Bin
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Items soft-deleted will be held for 30 days before permanent deletion from Cloudinary.
            </p>
          </div>
        </div>

        {/* Warning Indicator */}
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
          <AlertOctagon className="h-4.5 w-4.5 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="uppercase tracking-wider text-[10px] font-bold">Retention Warning</p>
            <p className="mt-0.5 font-medium">
              Files are permanently purged from your Cloudinary bucket after 30 days. Restoring them moves them back to their original virtual event rooms.
            </p>
          </div>
        </div>

        {/* Trash Control Toolbar */}
        {trashPhotos.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.length === trashPhotos.length && trashPhotos.length > 0}
                onChange={handleSelectAll}
                id="select-all-trash"
              />
              <label htmlFor="select-all-trash" className="text-xs font-bold text-foreground cursor-pointer">
                Select All ({selectedIds.length} of {trashPhotos.length} selected)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreSelected}
                disabled={selectedIds.length === 0 || restoreMutation.isPending}
                className="h-9 px-3.5 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Restore Selected
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handlePermanentDeleteSelected}
                disabled={selectedIds.length === 0 || permanentDeleteMutation.isPending}
                className="h-9 px-3.5 text-xs font-extrabold rounded-xl gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </Button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : trashPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-border rounded-3xl bg-card/40">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-border flex items-center justify-center text-zinc-400">
              <Trash2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Trash Bin is Empty</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mx-auto font-medium">
                Soft-deleted items will appear here for 30 days with options to restore or permanently delete them.
              </p>
            </div>
          </div>
        ) : (
          /* Trash items list */
          <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {trashPhotos.map((photo) => {
                const daysLeft = getDaysRemaining(photo.deletedAt);
                const isUrgent = daysLeft <= 5;
                const isSelected = selectedIds.includes(photo.id);

                return (
                  <div
                    key={photo.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors ${
                      isSelected ? "bg-primary/[0.01]" : ""
                    }`}
                  >
                    <div className="shrink-0 flex items-center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelect(photo.id, e.target.checked)}
                      />
                    </div>

                    {/* Thumbnail */}
                    <div className="h-14 w-14 rounded-lg overflow-hidden border border-border bg-zinc-950 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailUrl || photo.secureUrl}
                        alt={photo.fileName}
                        className="h-full w-full object-cover opacity-80"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{photo.fileName}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Size: {formatBytes(photo.fileSize || photo.asset?.bytes)}</span>
                        <span>•</span>
                        <span>Deleted: {photo.deletedAt ? formatDate(photo.deletedAt.toDate()) : formatDate(new Date())}</span>
                      </p>
                    </div>

                    {/* Status / Retention Timer */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 mt-3 sm:mt-0 border-t sm:border-t-0 border-border pt-2 sm:pt-0">
                      <div className="text-left sm:text-right text-xs">
                        <span className="text-muted-foreground flex items-center gap-1 leading-none">
                          <Info className="h-3.5 w-3.5 text-zinc-400" /> Retention window
                        </span>
                        <span
                          className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isUrgent
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-border"
                          }`}
                        >
                          {daysLeft === 0 ? "Purging today" : `${daysLeft} days remaining`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
