"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { auditLogService } from "@/services/AuditLogService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  ScrollText,
  Search,
  RefreshCw,
  ChevronRight,
  User,
  Calendar,
  Shield,
  Filter,
} from "lucide-react";
import type { AuditLog, AuditAction } from "@/types";

const ACTION_COLORS: Record<string, string> = {
  // User actions
  user_suspended:   "bg-red-550/10 text-red-650 dark:text-red-400 border-red-500/20",
  user_activated:   "bg-green-550/10 text-green-650 dark:text-green-400 border-green-500/20",
  user_deleted:     "bg-red-550/15 text-red-750 dark:text-red-300 border-red-500/30",
  // Photographer actions
  photographer_verified:   "bg-blue-550/10 text-blue-650 dark:text-blue-400 border-blue-500/20",
  photographer_suspended:  "bg-amber-550/10 text-amber-650 dark:text-amber-400 border-amber-500/20",
  photographer_deleted:    "bg-red-550/10 text-red-650 dark:text-red-400 border-red-500/20",
  // Booking actions
  booking_completed: "bg-green-550/10 text-green-650 dark:text-green-400 border-green-500/20",
  booking_cancelled: "bg-red-550/10 text-red-650 dark:text-red-400 border-red-500/20",
  // Review actions
  review_hidden:  "bg-amber-550/10 text-amber-650 dark:text-amber-400 border-amber-500/20",
  review_deleted: "bg-red-550/10 text-red-650 dark:text-red-400 border-red-500/20",
  // Download actions
  download_approved: "bg-green-550/10 text-green-650 dark:text-green-400 border-green-500/20",
  download_rejected: "bg-red-550/10 text-red-650 dark:text-red-400 border-red-500/20",
  // Settings actions
  settings_updated:  "bg-indigo-550/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20",
  feature_toggled:   "bg-purple-550/10 text-purple-650 dark:text-purple-400 border-purple-500/20",
  notification_sent: "bg-blue-550/10 text-blue-650 dark:text-blue-400 border-blue-500/20",
  // Fallback
  default:           "bg-zinc-550/10 text-zinc-650 dark:text-zinc-400 border-zinc-500/20",
};

const getActionColor = (action: string) =>
  ACTION_COLORS[action] ?? ACTION_COLORS["default"];

const PAGE_SIZE = 50;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterAction, setFilterAction] = React.useState<string>("");

  const loadLogs = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await auditLogService.list(
        filterAction ? { action: filterAction as AuditAction } : {},
        PAGE_SIZE
      );
      setLogs(result.data);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [filterAction]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.action?.toLowerCase().includes(q) ||
      l.performedBy?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.targetCollection?.toLowerCase().includes(q)
    );
  });

  const ACTION_OPTIONS = [
    "",
    "user_suspended", "user_activated", "user_deleted",
    "photographer_verified", "photographer_suspended", "photographer_deleted",
    "booking_completed", "booking_cancelled",
    "review_hidden", "review_deleted",
    "download_approved", "download_rejected",
    "settings_updated", "feature_toggled", "notification_sent",
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ScrollText className="h-7 w-7 text-primary" />
              Audit Log Trail
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Immutable event log of all sensitive admin actions performed on the platform.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            className="h-8 text-xs gap-1.5 border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search action, user, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3">
            <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent text-xs text-foreground py-2 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-background text-foreground">All Actions</option>
              {ACTION_OPTIONS.filter(Boolean).map((a) => (
                <option key={a} value={a} className="bg-background text-foreground">
                  {a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Log count */}
        <p className="text-[10px] text-muted-foreground font-semibold">
          Showing {filteredLogs.length} of {logs.length} logs
          {hasMore && " (more available — only last 50 shown)"}
        </p>

        {/* Log Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="bg-card border border-border py-20 text-center">
            <CardContent className="space-y-2">
              <ScrollText className="h-10 w-10 text-muted-foreground/45 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">No audit logs recorded yet</p>
              <p className="text-xs text-muted-foreground/75">
                Admin actions like approvals, suspensions, and settings changes will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, idx) => {
              const dateStr = log.createdAt?.toDate
                ? new Date(log.createdAt.toDate()).toLocaleString()
                : "—";
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-border/80 hover:bg-secondary/20 transition-all duration-200"
                >
                  {/* Action badge */}
                  <div className="shrink-0 mt-0.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${getActionColor(log.action)}`}>
                      {log.action?.replace(/_/g, " ") ?? "UNKNOWN"}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{log.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground/80" />
                        {log.performedBy?.slice(0, 12)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-muted-foreground/80" />
                        {log.performedByRole}
                      </span>
                      {log.targetCollection && (
                        <span className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3 text-muted-foreground/80" />
                          {log.targetCollection}
                        </span>
                      )}
                      <span className="flex items-center gap-1 ml-auto">
                        <Calendar className="h-3 w-3 text-muted-foreground/80" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Metadata preview */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 px-2.5 py-2 bg-secondary/50 rounded-lg border border-border/60">
                        <p className="text-[9px] font-mono text-muted-foreground truncate">
                          {JSON.stringify(log.metadata).slice(0, 120)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center py-3">
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Only the latest 50 logs are displayed. Use filters to narrow results.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
