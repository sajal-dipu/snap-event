"use client";

import * as React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface DeleteRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  roomName: string;
}

export function DeleteRoomDialog({
  isOpen,
  onClose,
  onConfirm,
  roomName,
}: DeleteRoomDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete room:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Event Room"
      description="This action is permanent and cannot be undone."
      className="max-w-md border-red-500/20"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Warning</p>
            <p className="mt-0.5">
              Deleting <strong>{roomName}</strong> will permanently remove all photos, guest access links, download requests, and visitor analytics.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Room"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
export default DeleteRoomDialog;
