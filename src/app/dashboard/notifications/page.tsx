"use client";

import * as React from "react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { notificationService } from "@/services/NotificationService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Search,
  Trash2,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import type { Notification } from "@/types";

const PRIORITY_BADGES: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  high: "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20",
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  info: { label: "Info", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Info },
  success: { label: "Success", color: "bg-green-500/10 text-green-650 dark:text-green-400 border-green-500/20", icon: CheckCircle },
  warning: { label: "Warning", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: AlertTriangle },
  error: { label: "Error", color: "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20", icon: XCircle },
  general: { label: "General", color: "bg-violet-500/10 text-violet-650 dark:text-violet-400 border-violet-500/20", icon: Bell },
};

function formatFullTime(ts: any): string {
  if (!ts) return "";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter and pagination states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "read" | "unread">("all");
  const [priorityFilter, setPriorityFilter] = React.useState<"all" | "high" | "medium" | "low">("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Subscribe to real-time updates
  React.useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
        setIsLoading(false);
      },
      100 // subscribe to latest 100
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]);

  // Compute filtered notifications
  const filtered = React.useMemo(() => {
    return notifications.filter((n) => {
      const titleText = n.title || "";
      const msgText = n.message || "";
      const matchesSearch =
        !searchQuery ||
        titleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msgText.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "read" && n.isRead) ||
        (statusFilter === "unread" && !n.isRead);

      const nPriority = n.priority || "medium";
      const matchesPriority =
        priorityFilter === "all" ||
        nPriority === priorityFilter;

      const matchesType =
        typeFilter === "all" ||
        n.type === typeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [notifications, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  // Auto-adjust page if exceeds totalPages
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      toast.success("Notification marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      toast.success("Notification deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || !user?.uid) return;
    try {
      await notificationService.markAllAsRead(user.uid);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark all as read");
    }
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG["general"];
  };

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 select-none max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Notifications Center</h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Manage your system updates, bookings alerts, and downloads requests.
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-9 text-xs font-black gap-1.5 border-border hover:bg-secondary text-foreground self-start sm:self-center transition-all duration-200"
            >
              <CheckCheck className="h-4 w-4 text-primary" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Filters Box */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Read/Unread select */}
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 shrink-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-muted-foreground hover:text-foreground py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread ({unreadCount})</option>
                <option value="read">Read</option>
              </select>
            </div>

            {/* Priority Select */}
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 shrink-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-muted-foreground hover:text-foreground py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            {/* Type Select */}
            <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-xl px-3 shrink-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-muted-foreground hover:text-foreground py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {Object.keys(TYPE_CONFIG).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card className="bg-card border border-border py-12 text-center max-w-md mx-auto">
            <CardContent className="space-y-3">
              <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-foreground">Database Error</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : paginated.length === 0 ? (
          <Card className="bg-card border border-border py-20 text-center max-w-lg mx-auto">
            <CardContent className="space-y-3">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-black text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {searchQuery || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all"
                  ? "Try resetting your filter parameters or search queries."
                  : "We'll alert you here when new system notifications or booking requests are created."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((n) => {
              const typeCfg = getTypeConfig(n.type);
              const TypeIcon = typeCfg.icon;
              const nPriority = n.priority || "medium";
              const priorityClass = PRIORITY_BADGES[nPriority];

              return (
                <div
                  key={n.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card border rounded-2xl hover:border-border/80 transition-all duration-200 ${
                    !n.isRead ? "border-primary/20 bg-primary/[0.02]" : "border-border"
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${typeCfg.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground truncate">{n.title}</h4>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase rounded border ${priorityClass}`}>
                          {nPriority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground/75 font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatFullTime(n.createdAt)}
                        </span>
                        {n.actionUrl && (
                          <a
                            href={n.actionUrl}
                            className="text-primary hover:underline flex items-center gap-0.5 font-bold"
                          >
                            View Details
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 self-end sm:self-center shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(n.id)}
                        className="h-8 px-2.5 text-[10px] font-black text-primary hover:bg-primary/5 rounded-lg flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(n.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg flex items-center justify-center"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                <span className="text-xs text-muted-foreground font-semibold">
                  Page {currentPage} of {totalPages} (Showing {filtered.length} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="h-8 px-2.5 border-border rounded-lg disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="h-8 px-2.5 border-border rounded-lg disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
