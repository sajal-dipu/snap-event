"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  ExternalLink,
  CalendarPlus,
  CheckCircle,
  XCircle,
  FolderPlus,
  FolderMinus,
  Download,
  FileX,
  Star,
  MessageSquare,
  Settings,
  Sparkles,
  Wrench,
  Tag,
  AlertTriangle,
  ShieldAlert,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";
import { notificationService } from "@/services/NotificationService";
import { toast } from "sonner";

interface NotificationDrawerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Grouping Helper
function getGroup(ts: any): "Today" | "Yesterday" | "Earlier" {
  if (!ts) return "Earlier";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (compareDate.getTime() === today.getTime()) {
    return "Today";
  } else if (compareDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  return "Earlier";
}

// Icon Mapping helper by notification type
function getNotificationIcon(type: string) {
  const iconProps = { className: "h-4 w-4 shrink-0" };
  switch (type) {
    case "booking_created":
    case "new_booking":
      return <CalendarPlus {...iconProps} className={cn(iconProps.className, "text-emerald-500")} />;
    case "booking_confirmed":
    case "booking_accepted":
    case "download_approved":
    case "success":
      return <CheckCircle {...iconProps} className={cn(iconProps.className, "text-green-500")} />;
    case "booking_rejected":
    case "download_rejected":
    case "booking_cancelled":
      return <XCircle {...iconProps} className={cn(iconProps.className, "text-red-500")} />;
    case "room_created":
      return <FolderPlus {...iconProps} className={cn(iconProps.className, "text-violet-500")} />;
    case "room_closed":
      return <FolderMinus {...iconProps} className={cn(iconProps.className, "text-slate-500")} />;
    case "download_requested":
      return <Download {...iconProps} className={cn(iconProps.className, "text-amber-500")} />;
    case "review_received":
    case "review":
      return <Star {...iconProps} className={cn(iconProps.className, "text-yellow-500 fill-yellow-500/20")} />;
    case "general":
    case "admin_message":
    case "custom_message":
      return <MessageSquare {...iconProps} className={cn(iconProps.className, "text-indigo-500")} />;
    case "system_announcement":
    case "system":
      return <Settings {...iconProps} className={cn(iconProps.className, "text-blue-500")} />;
    case "update":
      return <Sparkles {...iconProps} className={cn(iconProps.className, "text-teal-500")} />;
    case "maintenance":
      return <Wrench {...iconProps} className={cn(iconProps.className, "text-sky-500")} />;
    case "promotion":
      return <Tag {...iconProps} className={cn(iconProps.className, "text-pink-500")} />;
    case "warning":
      return <AlertTriangle {...iconProps} className={cn(iconProps.className, "text-orange-500")} />;
    case "security":
      return <ShieldAlert {...iconProps} className={cn(iconProps.className, "text-rose-500")} />;
    default:
      return <Info {...iconProps} className={cn(iconProps.className, "text-zinc-500")} />;
  }
}

export function NotificationDrawer({
  userId,
  isOpen,
  onClose,
  isAdmin = false,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [activeTab, setActiveTab] = React.useState<"all" | "unread">("unread");
  const [pageSize, setPageSize] = React.useState(15);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  // Subscribe in real-time
  React.useEffect(() => {
    if (!userId || !isOpen) return;

    let isFirstRun = true;
    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (updatedList) => {
        setNotifications(updatedList);
        setHasMore(updatedList.length >= pageSize);
        setLoadingMore(false);
        isFirstRun = false;
      },
      pageSize
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, isOpen, pageSize]);

  // Actions
  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const batchPromises = notifications.map((n) =>
        notificationService.deleteNotification(n.id)
      );
      await Promise.all(batchPromises);
      toast.success("All loaded notifications cleared");
    } catch (err) {
      console.error("Clear all failed:", err);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setPageSize((prev) => prev + 15);
  };

  // Close on ESC
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Grouped and filtered list
  const filtered = React.useMemo(() => {
    return activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;
  }, [notifications, activeTab]);

  const groups = React.useMemo(() => {
    const g: Record<"Today" | "Yesterday" | "Earlier", Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    filtered.forEach((n) => {
      g[getGroup(n.createdAt)].push(n);
    });
    return g;
  }, [filtered]);

  // Priority Border Styles
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-500/10";
      case "medium":
        return "border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10";
      case "low":
      default:
        return "border-l-4 border-l-zinc-300 dark:border-l-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30";
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-out drawer container */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full sm:w-[420px] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform",
          isOpen ? "translate-x-0" : "translate-x-full",
          isAdmin
            ? "bg-zinc-950 text-white border-l border-zinc-900"
            : "bg-background text-foreground border-l border-border"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Notification Center"
      >
        {/* Drawer Header */}
        <div
          className={cn(
            "p-5 border-b flex items-center justify-between shrink-0",
            isAdmin ? "border-zinc-900" : "border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <BellRing className={cn("h-5 w-5", isAdmin ? "text-indigo-400" : "text-primary")} />
            <h2 className="font-extrabold text-base tracking-tight">Notification Center</h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
              isAdmin ? "hover:bg-zinc-900 text-zinc-400 hover:text-white" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
            aria-label="Close Notification Drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Controls & Actions */}
        <div
          className={cn(
            "px-5 py-3 border-b flex items-center justify-between gap-4 shrink-0 bg-muted/10",
            isAdmin ? "border-zinc-900" : "border-border"
          )}
        >
          <div className="flex bg-muted/40 p-0.5 rounded-lg text-xs" role="tablist">
            {(["unread", "all"] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 rounded-md font-bold uppercase tracking-wider transition-all focus:outline-none",
                    isActive
                      ? isAdmin
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "unread" ? "Unread" : "All"}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className={cn(
                  "p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none",
                  isAdmin
                    ? "border-zinc-900 hover:bg-zinc-900 text-indigo-400"
                    : "border-border hover:bg-secondary text-primary"
                )}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                title="Clear all loaded"
                className={cn(
                  "p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all focus:outline-none",
                  isAdmin
                    ? "border-zinc-900 hover:bg-zinc-900 text-rose-400"
                    : "border-border hover:bg-red-500/10 text-red-500"
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center animate-pulse",
                  isAdmin ? "bg-zinc-900" : "bg-secondary"
                )}
              >
                <Bell className={cn("h-6 w-6", isAdmin ? "text-zinc-700" : "text-muted-foreground")} />
              </div>
              <p className="text-sm font-bold text-foreground">You are all caught up!</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {activeTab === "unread"
                  ? "No new unread notifications right now."
                  : "Notifications for system alerts, bookings, and updates appear here."}
              </p>
            </div>
          ) : (
            <>
              {(["Today", "Yesterday", "Earlier"] as const).map((groupName) => {
                const groupItems = groups[groupName];
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-3">
                    <h3
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest pl-1",
                        isAdmin ? "text-zinc-650" : "text-muted-foreground/60"
                      )}
                    >
                      {groupName}
                    </h3>
                    <div className="space-y-2">
                      {groupItems.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "group relative flex items-start gap-4 p-4 rounded-xl border transition-all text-left shadow-xs",
                            isAdmin
                              ? "border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40"
                              : "border-border hover:bg-secondary/40",
                            getPriorityStyle(n.priority),
                            !n.isRead && (isAdmin ? "bg-indigo-950/20" : "bg-primary/5")
                          )}
                        >
                          {/* Left Icon Container */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                              isAdmin ? "border-zinc-900 bg-zinc-900" : "border-secondary bg-secondary/80"
                            )}
                          >
                            {getNotificationIcon(n.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-grow min-w-0 pr-6">
                            <p className={cn("text-xs font-black truncate", isAdmin ? "text-white" : "text-foreground")}>
                              {n.title}
                            </p>
                            <p
                              className={cn(
                                "text-[11px] leading-relaxed mt-1 font-medium",
                                isAdmin ? "text-zinc-400" : "text-muted-foreground"
                              )}
                            >
                              {n.message}
                            </p>

                            <div className="flex items-center gap-3 mt-2 shrink-0">
                              <span
                                className={cn(
                                  "text-[9px] font-semibold",
                                  isAdmin ? "text-zinc-600" : "text-muted-foreground/60"
                                )}
                              >
                                {timeAgo(n.createdAt)}
                              </span>
                              {n.actionUrl && (
                                <Link
                                  href={n.actionUrl}
                                  onClick={onClose}
                                  className={cn(
                                    "text-[9px] font-bold flex items-center gap-0.5 hover:underline",
                                    isAdmin ? "text-indigo-400" : "text-primary"
                                  )}
                                >
                                  {n.actionLabel || "View"}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Float Actions */}
                          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkRead(n.id)}
                                title="Mark as read"
                                className={cn(
                                  "p-1 rounded-md border transition-all focus:outline-none",
                                  isAdmin
                                    ? "border-zinc-800 bg-zinc-900 hover:text-indigo-400 text-zinc-400"
                                    : "border-border bg-background hover:text-primary text-muted-foreground"
                                )}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(n.id)}
                              title="Delete notification"
                              className={cn(
                                "p-1 rounded-md border transition-all focus:outline-none",
                                isAdmin
                                  ? "border-zinc-800 bg-zinc-900 hover:text-red-400 text-zinc-400"
                                  : "border-border bg-background hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                              )}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className={cn(
                      "w-full py-2.5 border rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all focus:outline-none shrink-0",
                      isAdmin
                        ? "border-zinc-900 hover:bg-zinc-900 text-zinc-300"
                        : "border-border hover:bg-secondary text-foreground"
                    )}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
