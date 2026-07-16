import * as React from "react";
import Link from "next/link";
import { Check, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationCardProps {
  notification: Notification;
  isAdmin: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: () => void;
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

const TYPE_COLORS: Record<string, string> = {
  booking_created: "bg-green-500",
  booking_confirmed: "bg-emerald-500",
  booking_cancelled: "bg-red-500",
  booking_completed: "bg-blue-500",
  room_created: "bg-violet-500",
  room_closed: "bg-slate-500",
  photo_uploaded: "bg-pink-500",
  download_requested: "bg-amber-500",
  download_approved: "bg-teal-500",
  download_rejected: "bg-orange-500",
  review_received: "bg-yellow-500",
  general: "bg-indigo-500",
  system_announcement: "bg-blue-600",
  booking_notification: "bg-green-600",
  event_reminder: "bg-amber-500",
  maintenance_notice: "bg-red-600",
  custom_message: "bg-purple-500",
};

export function NotificationCard({
  notification: n,
  isAdmin,
  onMarkRead,
  onDelete,
  onNavigate,
}: NotificationCardProps) {
  const dotColor = TYPE_COLORS[n.type] ?? "bg-indigo-500";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-4 py-3 transition-all border-b last:border-b-0 text-left",
        isAdmin
          ? "border-zinc-800/60 hover:bg-zinc-800/40"
          : "border-border hover:bg-secondary/40",
        !n.isRead && (isAdmin ? "bg-indigo-600/5" : "bg-primary/5")
      )}
      role="listitem"
    >
      {/* Dot indicator */}
      <div className="relative mt-0.5 shrink-0">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", dotColor + "/15")}>
          <div className={cn("w-2 h-2 rounded-full", dotColor)} />
        </div>
        {!n.isRead && (
          <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 border border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-bold leading-tight truncate", isAdmin ? "text-white" : "text-foreground")}>
          {n.title}
        </p>
        <p className={cn("text-[11px] leading-relaxed mt-0.5 line-clamp-2", isAdmin ? "text-zinc-400" : "text-muted-foreground")}>
          {n.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("text-[9px] font-semibold", isAdmin ? "text-zinc-500" : "text-muted-foreground/70")}>
            {timeAgo(n.createdAt)}
          </span>
          {n.actionUrl && (
            <Link
              href={n.actionUrl}
              onClick={onNavigate}
              className={cn(
                "text-[9px] font-bold flex items-center gap-0.5 transition-colors",
                isAdmin ? "text-indigo-400 hover:text-indigo-300" : "text-primary hover:text-primary/80"
              )}
            >
              {n.actionLabel || "View"}
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 ml-1 mt-0.5">
        {!n.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(n.id);
            }}
            title="Mark as read"
            aria-label="Mark as read"
            className={cn(
              "p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-primary",
              isAdmin
                ? "text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700"
                : "text-muted-foreground hover:text-primary hover:bg-secondary"
            )}
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(n.id);
          }}
          title="Delete notification"
          aria-label="Delete notification"
          className={cn(
            "p-1 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-destructive",
            isAdmin
              ? "text-zinc-500 hover:text-red-400 hover:bg-zinc-700"
              : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
          )}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default NotificationCard;
