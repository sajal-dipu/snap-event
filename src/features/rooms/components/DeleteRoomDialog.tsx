"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Loader, CheckCircle2, XCircle } from "lucide-react";

interface DeleteRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    onProgress: (stage: "photos" | "metadata" | "room" | "complete", details?: any) => void
  ) => Promise<{ failedCloudinaryCount: number }>;
  roomName: string;
}

export function DeleteRoomDialog({
  isOpen,
  onClose,
  onConfirm,
  roomName,
}: DeleteRoomDialogProps) {
  const [stage, setStage] = React.useState<"confirm" | "photos" | "metadata" | "room" | "complete" | "error">("confirm");
  const [photoProgress, setPhotoProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [failedCount, setFailedCount] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleProgress = (currentStage: "photos" | "metadata" | "room" | "complete", details?: any) => {
    setStage(currentStage);
    if (currentStage === "photos" && details) {
      setPhotoProgress({ current: details.current, total: details.total });
    }
  };

  const handleDelete = async () => {
    setStage("photos");
    try {
      const result = await onConfirm(handleProgress);
      setFailedCount(result.failedCloudinaryCount);
      setStage("complete");
    } catch (error: any) {
      console.error("Failed to delete room:", error);
      setErrorMessage(error?.message || "An unknown error occurred while deleting the room.");
      setStage("error");
    }
  };

  // Reset stage when reopening
  React.useEffect(() => {
    if (isOpen) {
      setStage("confirm");
      setPhotoProgress(null);
      setFailedCount(0);
      setErrorMessage("");
    }
  }, [isOpen]);

  const isDeleting = stage === "photos" || stage === "metadata" || stage === "room";

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title={stage === "confirm" ? "Delete Virtual Room" : "Room Deletion"}
      description={stage === "confirm" ? `Permanently delete "${roomName}"` : undefined}
      className="max-w-md border-red-500/20"
    >
      <div className="space-y-4">
        {/* Stage 1: Confirm Deletion */}
        {stage === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs leading-normal font-semibold space-y-2">
                <p className="text-sm font-extrabold">This action will permanently delete:</p>
                <ul className="list-disc pl-4 space-y-1 text-foreground dark:text-zinc-300">
                  <li>Room information</li>
                  <li>All uploaded photos</li>
                  <li>Cloudinary assets</li>
                  <li>AI face data</li>
                  <li>Guest mappings</li>
                </ul>
                <p className="text-red-600 dark:text-red-400 font-extrabold mt-2">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="rounded-xl font-bold"
              >
                Delete Room
              </Button>
            </div>
          </div>
        )}

        {/* Stage 2: In-Progress Deletions */}
        {isDeleting && (
          <div className="p-6 text-center space-y-5">
            <Loader className="h-10 w-10 text-primary animate-spin mx-auto" />
            <div className="space-y-2.5 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center justify-between px-6">
                <span className={stage === "photos" ? "text-foreground font-bold" : "text-muted-foreground/60"}>
                  1. Deleting photos...
                </span>
                {stage === "photos" && photoProgress && (
                  <span className="font-mono text-[10px] text-primary">
                    {photoProgress.current} / {photoProgress.total}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between px-6">
                <span className={stage === "metadata" ? "text-foreground font-bold" : "text-muted-foreground/60"}>
                  2. Deleting metadata...
                </span>
              </div>
              <div className="flex items-center justify-between px-6">
                <span className={stage === "room" ? "text-foreground font-bold" : "text-muted-foreground/60"}>
                  3. Deleting room...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Completed Successfully */}
        {stage === "complete" && (
          <div className="p-4 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-foreground">Room Deleted</h4>
              <p className="text-xs text-muted-foreground">
                All records, images, and face data associated with <strong>{roomName}</strong> have been fully removed.
              </p>
            </div>

            {failedCount > 0 && (
              <div className="p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-left text-xs font-semibold">
                Note: {failedCount} photo(s) failed to delete from Cloudinary. You may need to clean them up manually in your Cloudinary console.
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button onClick={onClose} className="rounded-xl px-8 font-bold">
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Stage 4: Error State */}
        {stage === "error" && (
          <div className="p-4 text-center space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-foreground">Deletion Failed</h4>
              <p className="text-xs text-red-500 font-semibold">{errorMessage}</p>
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={onClose} variant="outline" className="rounded-xl px-8">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
export default DeleteRoomDialog;
