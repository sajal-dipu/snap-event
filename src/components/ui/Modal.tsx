"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={cn(
              "relative z-10 w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-xl text-left",
              className
            )}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header */}
            {(title || description) && (
              <div className="mb-4 pr-6">
                {title && (
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="relative">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
export default Modal;
