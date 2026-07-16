"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { photoService } from "@/services/PhotoService";
import { adminService } from "@/services/AdminService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Search,
  Grid3x3,
  List,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle,
  FolderOpen,
  Calendar,
  Camera,
} from "lucide-react";
import type { Photo } from "@/types";

type ViewMode = "grid" | "list";

export default function AdminPhotosPage() {
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const loadPhotos = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await adminService.listAllPhotos(100);
      setPhotos(list);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to load platform photos database");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to permanently delete this photo? This cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await photoService.softDelete(photoId);
      toast.success("Photo has been deleted successfully.");
      loadPhotos();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete photo record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${selectedIds.size} selected photos? This cannot be undone.`)) return;
    setIsSubmitting(true);
    try {
      let successCount = 0;
      for (const id of Array.from(selectedIds)) {
        try {
          await photoService.softDelete(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete photo ${id}`, err);
        }
      }
      toast.success(`Successfully deleted ${successCount} of ${selectedIds.size} photos.`);
      loadPhotos();
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during batch delete operations.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredPhotos = photos.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.originalFilename?.toLowerCase().includes(q) ||
      p.roomId?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const processedCount = photos.filter((p) => p.isProcessed).length;
  const deletedCount = photos.filter((p) => p.isDeleted).length;

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ImageIcon className="h-7 w-7 text-primary" />
              Photos Repository
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {photos.length} total indexed photos · {processedCount} AI processed · {deletedCount} soft deleted
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isSubmitting}
                className="h-8 text-xs gap-1.5 font-bold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadPhotos}
              className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Photos", value: photos.length, icon: ImageIcon, color: "text-primary" },
            { label: "AI Processed", value: processedCount, icon: CheckCircle, color: "text-green-500" },
            { label: "Pending Processing", value: photos.length - processedCount, icon: Camera, color: "text-amber-500" },
            { label: "Soft Deleted", value: deletedCount, icon: Trash2, color: "text-red-500" },
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by filename, room ID, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary border border-border rounded-lg p-1 ml-auto">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <Card className="bg-card border border-border py-20 text-center">
            <CardContent className="space-y-2">
              <ImageIcon className="h-10 w-10 text-muted-foreground/45 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">No photos found</p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredPhotos.map((p) => (
              <div
                key={p.id}
                className={`relative group rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  selectedIds.has(p.id) ? "border-primary ring-1 ring-primary/50" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => toggleSelect(p.id)}
              >
                <div className="aspect-square bg-secondary">
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={p.originalFilename}
                      className="w-full h-full object-cover select-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* Selection Checkbox */}
                <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded border border-border p-0.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    readOnly
                    className="h-3 w-3 text-primary border-border bg-card rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-card text-primary"
                        checked={selectedIds.size === filteredPhotos.length && filteredPhotos.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
                          else setSelectedIds(new Set());
                        }}
                      />
                    </th>
                    <th className="p-4">Photo</th>
                    <th className="p-4">Room ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">AI Status</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhotos.map((p) => {
                    const dateStr = p.createdAt?.toDate
                      ? new Date(p.createdAt.toDate()).toLocaleDateString()
                      : "—";
                    return (
                      <tr key={p.id} className="border-b border-border hover:bg-secondary/40 transition-colors text-foreground">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="rounded border-border bg-card text-primary"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-secondary border border-border overflow-hidden shrink-0">
                              {p.thumbnailUrl ? (
                                <img src={p.thumbnailUrl} alt={p.originalFilename} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground truncate max-w-[160px]">{p.originalFilename || "Unnamed"}</p>
                              <p className="text-[10px] text-muted-foreground">{p.faceCount} face{p.faceCount !== 1 ? "s" : ""} detected</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-muted-foreground text-[10px] flex items-center gap-1">
                            <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                            {p.roomId?.slice(0, 10)}...
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {dateStr}
                          </p>
                        </td>
                        <td className="p-4">
                          {p.isProcessed ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle className="h-2.5 w-2.5" />Processed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Pending AI
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            p.isDeleted
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : p.status === "ready"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-muted text-muted-foreground border-border"
                          }`}>
                            {p.isDeleted ? "Deleted" : p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.asset?.secureUrl && (
                              <a
                                href={p.asset.secureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSubmitting}
                              onClick={() => handleDelete(p.id)}
                              className="h-7 w-7 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-border">
              {filteredPhotos.map((p) => {
                const dateStr = p.createdAt?.toDate
                  ? new Date(p.createdAt.toDate()).toLocaleDateString()
                  : "—";
                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-card text-primary"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                      <div className="w-12 h-12 rounded-xl bg-secondary border border-border overflow-hidden shrink-0">
                        {p.thumbnailUrl ? (
                          <img
                            src={p.thumbnailUrl}
                            alt={p.originalFilename}
                            className="w-full h-full object-cover rounded-xl"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-semibold text-foreground text-xs truncate">{p.originalFilename || "Unnamed"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.faceCount} face{p.faceCount !== 1 ? "s" : ""} detected</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          p.isDeleted
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : p.status === "ready"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {p.isDeleted ? "Deleted" : p.status}
                        </span>
                        {p.isProcessed ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-green-500/10 text-green-500 border-green-500/20 animate-none">
                            <CheckCircle className="h-2.5 w-2.5" />Processed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-amber-500/10 text-amber-500 border-amber-500/20 animate-none">
                            Pending AI
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-2.5 rounded-xl border border-border">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Room ID</span>
                        <p className="font-mono text-muted-foreground text-[10px] truncate flex items-center gap-1">
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                          {p.roomId}
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Upload Date</span>
                        <p className="text-muted-foreground flex items-center justify-end gap-1 font-semibold text-[10px]">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {dateStr}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {p.asset?.secureUrl && (
                        <a
                          href={p.asset.secureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border-border hover:bg-secondary flex items-center justify-center gap-1 font-bold"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Original
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleDelete(p.id)}
                        className="h-8 px-3 text-xs text-red-500 hover:text-red-650 border-red-500/20 hover:bg-red-500/10 flex items-center justify-center gap-1 font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground font-semibold">
              Showing {filteredPhotos.length} of {photos.length} photos
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}

// Simple layout wrapper fallback inside the same bundle to ensure loading layout consistency
function AdminPhotosPageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
