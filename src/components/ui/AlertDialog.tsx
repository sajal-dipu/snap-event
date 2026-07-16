"use client";

import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: AlertDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} className="max-w-md">
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
export default AlertDialog;
