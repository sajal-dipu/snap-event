"use client";

import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { notificationService } from "@/services/NotificationService";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDrawer } from "./NotificationDrawer";
import { toast } from "sonner";

interface NotificationBellProps {
  userId: string;
  /** Visual variant — admin uses a dark themed header */
  variant?: "admin" | "photographer";
}

export function NotificationBell({ userId, variant = "photographer" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isAdmin = variant === "admin";

  const notificationsRef = React.useRef<Notification[]>([]);
  React.useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // ── Real-time Firestore subscription ─────────────────────────────
  React.useEffect(() => {
    if (!userId) return;

    let isFirstRun = true;

    // Use notificationService to subscribe real-time
    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (updatedNotifications) => {
        if (!isFirstRun) {
          const prevList = notificationsRef.current;
          const newUnreads = updatedNotifications.filter(
            (n) => !n.isRead && !prevList.some((prev) => prev.id === n.id)
          );
          
          newUnreads.forEach((n) => {
            toast(n.title, {
              description: n.message,
              action: n.actionUrl ? {
                label: "View",
                onClick: () => {
                  window.location.href = n.actionUrl!;
                }
              } : undefined,
            });
          });
        }
        isFirstRun = false;
        setNotifications(updatedNotifications);
      },
      10 // latest 10 notifications as requested for dropdown panel
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  // ── Close on outside click ───────────────────────────────────
  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  // ── Close on ESC ─────────────────────────────────────────────
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const btnClass = isAdmin
    ? "h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-all relative focus:outline-none focus:ring-1 focus:ring-primary"
    : "h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all relative focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div ref={panelRef} className="relative">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((p) => !p)}
        className={btnClass}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {unreadCount > 0 ? (
          <BellRing className={isAdmin ? "h-4 w-4" : "h-5 w-5"} />
        ) : (
          <Bell className={isAdmin ? "h-4 w-4" : "h-5 w-5"} />
        )}
        <NotificationBadge count={unreadCount} />
      </button>

      <NotificationDrawer
        userId={userId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default NotificationBell;
