"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService } from "@/services/AdminService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  FolderOpen,
  Search,
  Eye,
  Archive,
  X,
  RefreshCw,
  Camera,
  Calendar,
  Users,
  ImageIcon,
  Download,
  Lock,
  Globe,
  Zap,
} from "lucide-react";
import type { VirtualRoom } from "@/types";
import Link from "next/link";

type FilterStatus = "all" | "active" | "live" | "upcoming" | "closed" | "archived" | "completed";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  live: { label: "Live", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  closed: { label: "Closed", color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  archived: { label: "Archived", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

export default function AdminRoomsPage() {
  const [rooms, setRooms] = React.useState<VirtualRoom[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  const loadRooms = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await adminService.listAllRooms();
      setRooms(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load room registries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleStatusChange = async (roomId: string, status: "active" | "closed" | "archived") => {
    if (!confirm(`Are you sure you want to transition this room to ${status}?`)) return;
    setIsSubmitting(true);
    try {
      await adminService.updateRoomStatus(roomId, status);
      toast.success(`Room state transitioned to ${status}`);
      loadRooms();
    } catch (err) {
      console.error(err);
      toast.error("Failed to transition room state");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.name?.toLowerCase().includes(q) ||
      r.photographerName?.toLowerCase().includes(q);
    const matchesFilter = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const activeCount = rooms.filter((r) => r.status === "active" || r.status === "live").length;
  const totalPhotos = rooms.reduce((sum, r) => sum + (r.photoCount || 0), 0);
  const totalGuests = rooms.reduce((sum, r) => sum + (r.guestCount || 0), 0);

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <FolderOpen className="h-7 w-7 text-primary" />
              Virtual Room Registry
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {rooms.length} total rooms · {activeCount} live/active · {totalPhotos.toLocaleString()} photos · {totalGuests.toLocaleString()} guests
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRooms}
            className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Rooms", value: rooms.length, icon: FolderOpen, color: "text-primary" },
            { label: "Active / Live", value: activeCount, icon: Zap, color: "text-green-500" },
            { label: "Total Photos", value: totalPhotos.toLocaleString(), icon: ImageIcon, color: "text-pink-500" },
            { label: "Total Guests", value: totalGuests.toLocaleString(), icon: Users, color: "text-amber-500" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{s.label}</p>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search room, photographer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-secondary border border-border rounded-lg p-1">
            {(["all", "active", "live", "upcoming", "closed", "archived", "completed"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${
                  filterStatus === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="bg-card border border-border py-20 text-center">
            <CardContent className="space-y-2">
              <FolderOpen className="h-10 w-10 text-muted-foreground/45 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">No rooms found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Room</th>
                    <th className="p-4">Photographer</th>
                    <th className="p-4">Event Date</th>
                    <th className="p-4">Stats</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((r) => {
                    const eventDateStr = r.eventDate?.toDate
                      ? new Date(r.eventDate.toDate()).toLocaleDateString()
                      : "—";
                    const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["closed"];
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-secondary/40 transition-colors text-foreground">
                        {/* Room */}
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              r.status === "live" || r.status === "active"
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-secondary border-border"
                            }`}>
                              <FolderOpen className={`h-3.5 w-3.5 ${
                                r.status === "live" || r.status === "active" ? "text-green-500" : "text-muted-foreground"
                              }`} />
                            </div>
                            <div>
                              <p className="font-bold text-foreground truncate max-w-[140px]">{r.name}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold capitalize">{r.eventType}</p>
                            </div>
                          </div>
                        </td>

                        {/* Photographer */}
                        <td className="p-4">
                          <p className="text-foreground font-semibold flex items-center gap-1">
                            <Camera className="h-3 w-3 text-muted-foreground shrink-0" />
                            {r.photographerName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            {r.requireApprovalForDownload ? (
                              <><Lock className="h-2.5 w-2.5 text-muted-foreground" />Approval required</>
                            ) : (
                              <><Globe className="h-2.5 w-2.5 text-muted-foreground" />Free download</>
                            )}
                          </p>
                        </td>

                        {/* Event Date */}
                        <td className="p-4">
                          <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {eventDateStr}
                          </p>
                        </td>

                        {/* Stats */}
                        <td className="p-4">
                          <div className="flex gap-3 text-[10px] font-semibold">
                            <span className="flex items-center gap-1 text-pink-500">
                              <ImageIcon className="h-3 w-3" />{r.photoCount}
                            </span>
                            <span className="flex items-center gap-1 text-blue-500">
                              <Users className="h-3 w-3" />{r.guestCount}
                            </span>
                            <span className="flex items-center gap-1 text-green-500">
                              <Download className="h-3 w-3" />{r.downloadRequestCount}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/rooms/${r.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                                title="View Room"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            {r.status !== "archived" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isSubmitting}
                                onClick={() => handleStatusChange(r.id, "archived")}
                                className="h-7 w-7 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                title="Archive Room"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {r.status !== "closed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isSubmitting}
                                onClick={() => handleStatusChange(r.id, "closed")}
                                className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                title="Close Room"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-border">
              {filteredRooms.map((r) => {
                const eventDateStr = r.eventDate?.toDate
                  ? new Date(r.eventDate.toDate()).toLocaleDateString()
                  : "—";
                const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["closed"];
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        r.status === "live" || r.status === "active"
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-secondary border-border"
                      }`}>
                        <FolderOpen className={`h-4 w-4 ${
                          r.status === "live" || r.status === "active" ? "text-green-500" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-foreground text-sm truncate">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold capitalize">{r.eventType}</p>
                      </div>
                      <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs bg-secondary/30 p-2.5 rounded-xl border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Photographer</span>
                        <div className="text-right">
                          <p className="text-foreground font-semibold flex items-center justify-end gap-1 text-xs">
                            <Camera className="h-3 w-3 text-muted-foreground shrink-0" />
                            {r.photographerName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1 font-semibold">
                            {r.requireApprovalForDownload ? (
                              <><Lock className="h-2.5 w-2.5 text-muted-foreground animate-none" />Approval required</>
                            ) : (
                              <><Globe className="h-2.5 w-2.5 text-muted-foreground animate-none" />Free download</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-1.5 mt-1.5">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Event Date</span>
                        <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {eventDateStr}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-1.5 mt-1.5">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Metrics</span>
                        <div className="flex gap-3 text-[10px] font-semibold">
                          <span className="flex items-center gap-0.5 text-pink-500">
                            <ImageIcon className="h-3.5 w-3.5" />{r.photoCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-blue-500">
                            <Users className="h-3.5 w-3.5" />{r.guestCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-green-500">
                            <Download className="h-3.5 w-3.5" />{r.downloadRequestCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-border/40">
                      <Link href={`/dashboard/rooms/${r.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border-border flex items-center justify-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </Button>
                      </Link>

                      {r.status !== "archived" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleStatusChange(r.id, "archived")}
                          className="h-8 px-3 rounded-lg text-xs text-amber-500 hover:text-amber-600 border-amber-500/20 hover:bg-amber-500/10 gap-1 flex items-center justify-center font-bold"
                          title="Archive Room"
                        >
                          Archive
                        </Button>
                      )}

                      {r.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleStatusChange(r.id, "closed")}
                          className="h-8 px-3 rounded-lg text-xs text-red-500 hover:text-red-600 border-red-500/20 hover:bg-red-500/10 gap-1 flex items-center justify-center font-bold"
                          title="Close Room"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground font-semibold">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
