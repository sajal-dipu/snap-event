import * as React from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { NotificationCard } from "./NotificationCard";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isOpen,
  isAdmin,
  onClose,
  onMarkRead,
  onDelete,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = React.useState<"unread" | "all">("unread");

  if (!isOpen) return null;

  const displayed =
    activeTab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const panelClass = isAdmin
    ? "absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[360px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
    : "absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-[360px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden";

  return (
    <div className={panelClass} role="dialog" aria-label="Notifications panel">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b",
          isAdmin ? "border-zinc-800" : "border-border"
        )}
      >
        <div className="flex items-center gap-2 text-left">
          <BellRing className={cn("h-4 w-4", isAdmin ? "text-indigo-400" : "text-primary")} />
          <span className={cn("text-sm font-black", isAdmin ? "text-white" : "text-foreground")}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all as read"
              aria-label="Mark all notifications as read"
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all focus:outline-none focus:ring-1 focus:ring-primary",
                isAdmin
                  ? "text-zinc-550 hover:text-indigo-400 hover:bg-zinc-805"
                  : "text-muted-foreground hover:text-primary hover:bg-secondary"
              )}
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close notification panel"
            className={cn(
              "p-1.5 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-primary",
              isAdmin
                ? "text-zinc-550 hover:text-white hover:bg-zinc-805"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("flex border-b", isAdmin ? "border-zinc-800" : "border-border")} role="tablist">
        {(["unread", "all"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all focus:outline-none",
              activeTab === tab
                ? isAdmin
                  ? "border-b-2 border-indigo-500 text-indigo-400"
                  : "border-b-2 border-primary text-primary"
                : isAdmin
                ? "text-zinc-500 hover:text-zinc-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "unread" ? `Unread${unreadCount ? ` (${unreadCount})` : ""}` : "All"}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="max-h-[380px] overflow-y-auto" role="list">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isAdmin ? "bg-zinc-800" : "bg-secondary"
              )}
            >
              <Bell className={cn("h-5 w-5", isAdmin ? "text-zinc-650" : "text-muted-foreground")} />
            </div>
            <p className={cn("text-xs font-semibold", isAdmin ? "text-zinc-600" : "text-muted-foreground")}>
              {activeTab === "unread" ? "You're all caught up!" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div>
            {displayed.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                isAdmin={isAdmin}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          "px-4 py-2.5 border-t flex items-center justify-between",
          isAdmin ? "border-zinc-800 bg-zinc-900/50" : "border-border bg-muted/5"
        )}
      >
        <span className={cn("text-[10px] font-semibold", isAdmin ? "text-zinc-600" : "text-muted-foreground")}>
          {notifications.length > 0
            ? `Showing ${displayed.length} of ${notifications.length}`
            : "No notifications"}
        </span>
        <Link
          href={isAdmin ? "/admin/notifications" : "/dashboard/notifications"}
          onClick={onClose}
          className={cn(
            "text-[10px] font-bold hover:underline",
            isAdmin ? "text-indigo-400" : "text-primary"
          )}
        >
          View all
        </Link>
      </div>
    </div>
  );
}

export default NotificationDropdown;
