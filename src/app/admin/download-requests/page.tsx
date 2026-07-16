"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService } from "@/services/AdminService";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import {
  Download,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  FolderOpen,
  Image as ImageIcon,
  Calendar,
} from "lucide-react";
import type { DownloadRequest } from "@/types";

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "expired";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pending",  color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  expired:  { label: "Expired",  color: "bg-muted text-muted-foreground border-border" },
};

function generateApproveToken() {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const token = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return { expiresAt, token };
}

export default function AdminDownloadRequestsPage() {
  const [requests, setRequests] = React.useState<DownloadRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");

  const loadRequests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await adminService.listAllDownloadRequests();
      setRequests(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load download requests");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (requestId: string, roomId: string, photoIds: string[]) => {
    setIsSubmitting(true);
    try {
      const { expiresAt, token } = generateApproveToken();
      await downloadRequestService.approve(requestId, photoIds, expiresAt, "admin", token);
      toast.success("Download request approved (48h link)");
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setIsSubmitting(true);
    try {
      await downloadRequestService.reject(requestId, "Rejected by administrator", "admin");
      toast.success("Request rejected");
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerEmail?.toLowerCase().includes(q) ||
      r.roomId?.toLowerCase().includes(q);
    const matchesFilter = filterStatus === "all" || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
    expired: requests.filter(r => r.status === "expired").length,
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Download className="h-7 w-7 text-primary" />
              Download Requests
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {requests.length} total · {counts.pending} pending approval · {counts.approved} approved
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRequests}
            className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Status tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.entries(counts) as [FilterStatus, number][]).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterStatus === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <p className="text-xs font-black capitalize">{key}</p>
              <p className="text-2xl font-black mt-1 text-foreground">{count}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guest name, email, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner className="h-8 w-8 text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="bg-card border border-border py-20 text-center">
            <CardContent className="space-y-2">
              <Download className="h-10 w-10 text-muted-foreground/45 mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">No download requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Guest</th>
                    <th className="p-4">Room</th>
                    <th className="p-4">Photos</th>
                    <th className="p-4">Requested</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => {
                    const dateStr = r.createdAt?.toDate
                      ? new Date(r.createdAt.toDate()).toLocaleDateString()
                      : "—";
                    const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["pending"];
                    const isPending = r.status === "pending";
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-secondary/40 transition-colors text-foreground">
                        {/* Guest */}
                        <td className="p-4">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground shrink-0" />
                            {r.customerName || "Anonymous"}
                          </p>
                          {r.customerEmail && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.customerEmail}</p>
                          )}
                        </td>

                        {/* Room */}
                        <td className="p-4">
                          <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                            <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-mono text-[10px]">{r.roomId?.slice(0, 10)}...</span>
                          </p>
                        </td>

                        {/* Photos */}
                        <td className="p-4">
                          <p className="text-foreground font-semibold flex items-center gap-1">
                            <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                            {r.requestedPhotoIds?.length ?? 0} photos
                          </p>
                          {r.matchedPhotoIds?.length > 0 && (
                            <p className="text-[10px] text-primary font-semibold mt-0.5">
                              {r.matchedPhotoIds.length} matched by AI
                            </p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-4">
                          <p className="text-muted-foreground flex items-center gap-1 font-semibold">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            {dateStr}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${statusCfg.color}`}>
                            {r.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                            {r.status === "approved" && <CheckCircle className="h-2.5 w-2.5" />}
                            {r.status === "rejected" && <XCircle className="h-2.5 w-2.5" />}
                            {statusCfg.label}
                          </span>
                          {r.downloadExpiresAt?.toDate && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">
                              Exp: {new Date(r.downloadExpiresAt.toDate()).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={isSubmitting}
                                  onClick={() => handleApprove(r.id, r.roomId, r.requestedPhotoIds || [])}
                                  className="h-7 px-2.5 rounded-lg text-[9px] font-black bg-green-600 hover:bg-green-700 text-white gap-1"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isSubmitting}
                                  onClick={() => handleReject(r.id)}
                                  className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  title="Reject"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {r.downloadUrl && (
                              <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                                  title="View Download Link"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </a>
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
              {filteredRequests.map((r) => {
                const dateStr = r.createdAt?.toDate
                  ? new Date(r.createdAt.toDate()).toLocaleDateString()
                  : "—";
                const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["pending"];
                const isPending = r.status === "pending";
                return (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {r.customerName || "Anonymous"}
                        </p>
                        {r.customerEmail && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.customerEmail}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase border ${statusCfg.color}`}>
                          {r.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                          {r.status === "approved" && <CheckCircle className="h-2.5 w-2.5" />}
                          {r.status === "rejected" && <XCircle className="h-2.5 w-2.5" />}
                          {statusCfg.label}
                        </span>
                        {r.downloadExpiresAt?.toDate && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">
                            Exp: {new Date(r.downloadExpiresAt.toDate()).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-2.5 rounded-xl border border-border">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Room ID</span>
                        <p className="font-mono text-foreground text-[10px] truncate flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.roomId}
                        </p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Requested Photos</span>
                        <p className="text-foreground flex items-center justify-end gap-1 font-semibold text-[10px]">
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.requestedPhotoIds?.length ?? 0} photos
                        </p>
                        {r.matchedPhotoIds?.length > 0 && (
                          <p className="text-[9px] text-primary font-semibold mt-0.5">
                            {r.matchedPhotoIds.length} matched by AI
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center justify-between border-t border-border pt-1.5 mt-1">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Request Date</span>
                        <p className="text-foreground flex items-center gap-1 font-semibold text-[10px]">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {dateStr}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleApprove(r.id, r.roomId, r.requestedPhotoIds || [])}
                            className="flex-1 h-8 rounded-lg text-xs font-black bg-green-600 hover:bg-green-700 text-white gap-1 flex items-center justify-center"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleReject(r.id)}
                            className="h-8 px-3 rounded-lg text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 border-border flex items-center justify-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {r.downloadUrl && (
                        <a href={r.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border-border hover:bg-secondary flex items-center justify-center gap-1 font-bold"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Download
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground font-semibold">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
}
