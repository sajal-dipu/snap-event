"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { roomService } from "@/services/RoomService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { APP_URL } from "@/utils/helpers";

import {
  Check,
  X,
  Eye,
  Clock,
  User,
  Phone,
  Mail,
  Search,
  Sparkles,
  MessageSquare,
  Copy,
  Info,
  Calendar,
  Layers,
  Trash2,
  Lock,
  ListFilter
} from "lucide-react";
import type { DownloadRequest, DownloadRequestStatus } from "@/types";

export default function DownloadRequestsPage() {
  const { user } = useAuth();

  // Data States
  const [requests, setRequests] = React.useState<DownloadRequest[]>([]);
  const [roomsMap, setRoomsMap] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);

  // Filter States
  const [statusTab, setStatusTab] = React.useState<DownloadRequestStatus>("pending");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Modal / Interaction States
  const [activeRequest, setActiveRequest] = React.useState<DownloadRequest | null>(null);
  const [isApproveOpen, setIsApproveOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [isPhotosOpen, setIsPhotosOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  // Form states inside dialogs
  const [expiryHours, setExpiryHours] = React.useState<24 | 48 | 168>(24);
  const [internalNotes, setInternalNotes] = React.useState("");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [photoPreviews, setPhotoPreviews] = React.useState<any[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = React.useState(false);
  const [downloadHistory, setDownloadHistory] = React.useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Bulk actions status
  const [isBulkApproveOpen, setIsBulkApproveOpen] = React.useState(false);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = React.useState(false);

  // Fetch download requests
  const loadRequests = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await downloadRequestService.listByPhotographer(user.uid, {}, 100);
      setRequests(response.data);

      // Load associated rooms name mapping
      const roomIds = Array.from(new Set(response.data.map((r) => r.roomId)));
      const nameMap: Record<string, string> = {};
      await Promise.all(
        roomIds.map(async (roomId) => {
          try {
            const rDoc = await roomService.getById(roomId);
            if (rDoc) nameMap[roomId] = rDoc.name;
          } catch {
            nameMap[roomId] = "Unknown Room";
          }
        })
      );
      setRoomsMap(nameMap);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load download requests");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Expiry dates helper
  const getExpiryDate = (hours: number): Date => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d;
  };

  // Unique token generator
  const generateToken = (): string => {
    return "dl_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Individual Approval
  const handleApproveClick = (req: DownloadRequest) => {
    setActiveRequest(req);
    setExpiryHours(24);
    setInternalNotes(req.internalNotes || "");
    setIsApproveOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!activeRequest || !user) return;
    setIsSubmitting(true);
    try {
      const token = generateToken();
      const expiresAt = getExpiryDate(expiryHours);
      
      await downloadRequestService.approve(
        activeRequest.id,
        activeRequest.requestedPhotoIds,
        expiresAt,
        user.uid,
        token,
        internalNotes
      );
      toast.success("Request approved and download token generated");
      setIsApproveOpen(false);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Individual Rejection
  const handleRejectClick = (req: DownloadRequest) => {
    setActiveRequest(req);
    setRejectionReason("");
    setInternalNotes(req.internalNotes || "");
    setIsRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!activeRequest || !user) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsSubmitting(true);
    try {
      await downloadRequestService.reject(
        activeRequest.id,
        rejectionReason,
        user.uid,
        internalNotes
      );
      toast.success("Request rejected successfully");
      setIsRejectOpen(false);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Actions
  const handleBulkApproveConfirm = async () => {
    if (selectedIds.length === 0 || !user) return;
    setIsSubmitting(true);
    try {
      const expiresAt = getExpiryDate(expiryHours);
      await Promise.all(
        selectedIds.map((id) => {
          const req = requests.find((r) => r.id === id);
          if (!req || req.status !== "pending") return Promise.resolve();
          const token = generateToken();
          return downloadRequestService.approve(
            req.id,
            req.requestedPhotoIds,
            expiresAt,
            user.uid,
            token,
            internalNotes
          );
        })
      );
      toast.success(`Approved ${selectedIds.length} requests successfully`);
      setIsBulkApproveOpen(false);
      setSelectedIds([]);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve some requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkRejectConfirm = async () => {
    if (selectedIds.length === 0 || !user) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const req = requests.find((r) => r.id === id);
          if (!req || req.status !== "pending") return Promise.resolve();
          return downloadRequestService.reject(
            req.id,
            rejectionReason,
            user.uid,
            internalNotes
          );
        })
      );
      toast.success(`Rejected ${selectedIds.length} requests successfully`);
      setIsBulkRejectOpen(false);
      setSelectedIds([]);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject some requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  // View Photos Modal
  const handleViewPhotosClick = async (req: DownloadRequest) => {
    setActiveRequest(req);
    setIsPhotosOpen(true);
    setIsLoadingPhotos(true);
    setPhotoPreviews([]);
    try {
      const snaps = await Promise.all(
        req.requestedPhotoIds.map((id) => getDoc(doc(db, "photos", id)))
      );
      const photos = snaps
        .filter((s) => s.exists())
        .map((s) => ({ id: s.id, ...(s.data() as any) }));
      setPhotoPreviews(photos);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load photo previews");
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // View Download History Log
  const handleViewHistoryClick = async (req: DownloadRequest) => {
    setActiveRequest(req);
    setIsHistoryOpen(true);
    setDownloadHistory([]);
    try {
      const history = await downloadRequestService.getHistory(req.id);
      setDownloadHistory(history);
    } catch (err) {
      console.error(err);
      toast.error("Failed to retrieve download history");
    }
  };

  // Selection toggle
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredIds: string[]) => {
    setSelectedIds(filteredIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    return requests.filter((req) => {
      // 1. Status Filter
      const matchesStatus = req.status === statusTab;
      // 2. Search query (Guest Name, Phone, Email, Room Name)
      const roomName = roomsMap[req.roomId] || "";
      const matchesSearch =
        req.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.customerPhone.includes(searchQuery) ||
        (req.customerEmail && req.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        roomName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [requests, statusTab, searchQuery, roomsMap]);

  const filteredPendingIds = React.useMemo(() => {
    return filteredRequests.filter((r) => r.status === "pending").map((r) => r.id);
  }, [filteredRequests]);

  const allSelected =
    filteredPendingIds.length > 0 &&
    filteredPendingIds.every((id) => selectedIds.includes(id));

  // Copy Link to Clipboard
  const handleCopyLink = async (token?: string) => {
    if (!token) return;
    try {
      const secureLink = `${APP_URL}/download/${token}`;
      await navigator.clipboard.writeText(secureLink);
      toast.success("Secure download link copied to clipboard!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy link");
    }
  };

  const tabs: { label: string; value: DownloadRequestStatus }[] = [
    { label: "Pending Reviews", value: "pending" },
    { label: "Approved Sessions", value: "approved" },
    { label: "Rejected Requests", value: "rejected" },
    { label: "Expired Links", value: "expired" },
  ];

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 select-none">
        
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Lock className="h-7 w-7 text-primary" />
            Download Gatekeeper
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review face recognition matches and approve temporary secure photo download sessions for guests.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shrink-0">
            {tabs.map((tab) => {
              const active = statusTab === tab.value;
              const count = requests.filter((r) => r.status === tab.value).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusTab(tab.value);
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 shrink-0" />
            <Input
              type="text"
              placeholder="Search by guest, phone, event room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border placeholder:text-zinc-400 text-sm focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Requests Table/List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Loading request database...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/25 py-20 text-center max-w-md mx-auto">
            <CardContent className="space-y-4">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                <ListFilter className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-foreground">No Requests Found</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  No requests matching this view status or search filters are registered.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            
            {/* Bulk Selection Header */}
            {statusTab === "pending" && (
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-border rounded-2xl text-xs font-semibold">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      allSelected
                        ? handleDeselectAll()
                        : handleSelectAll(filteredPendingIds)
                    }
                    className="h-5 w-5 border border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center bg-card text-primary shrink-0"
                  >
                    {allSelected && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                  </button>
                  <span className="text-muted-foreground">
                    {selectedIds.length} request{selectedIds.length !== 1 ? "s" : ""} selected
                  </span>
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsBulkApproveOpen(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold h-8 rounded-lg px-3"
                    >
                      Bulk Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsBulkRejectOpen(true)}
                      className="border-zinc-200 dark:border-zinc-800 text-red-600 dark:text-red-400 text-[10px] font-bold h-8 rounded-lg px-3"
                    >
                      Bulk Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.map((req) => {
                const isSelected = selectedIds.includes(req.id);
                return (
                  <Card
                    key={req.id}
                    className={`border transition-all duration-200 ${
                      isSelected ? "border-primary bg-primary/[0.01]" : "border-border hover:border-zinc-300 dark:hover:border-zinc-800"
                    }`}
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      
                      <div className="flex items-start gap-4">
                        {statusTab === "pending" && (
                          <button
                            onClick={() => handleSelectToggle(req.id)}
                            className={`h-5.5 w-5.5 border rounded-lg flex items-center justify-center mt-1 shrink-0 ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-zinc-300 dark:border-zinc-700 bg-card"
                            }`}
                          >
                            {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                          </button>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center flex-wrap gap-2.5">
                            <h4 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                              <User className="h-4 w-4 text-zinc-400 shrink-0" />
                              {req.customerName}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-muted-foreground">
                              {roomsMap[req.roomId] || "Loading Room..."}
                            </span>
                            {req.matchConfidence > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 font-bold text-green-600 dark:text-green-400">
                                AI Confidence: {Math.round(req.matchConfidence * 100)}%
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-semibold">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-zinc-400" />
                              {req.customerPhone}
                            </span>
                            {req.customerEmail && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-zinc-400" />
                                {req.customerEmail}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : "Just now"}
                            </span>
                          </div>

                          {req.specialMessage && (
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-xs font-semibold text-muted-foreground border border-border flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
                              <p className="leading-relaxed">&ldquo;{req.specialMessage}&rdquo;</p>
                            </div>
                          )}

                          {req.internalNotes && (
                            <p className="text-[10px] text-zinc-400 font-bold italic">
                              Internal Note: {req.internalNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="shrink-0 flex items-center flex-wrap gap-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPhotosClick(req)}
                          className="h-9 rounded-xl border-zinc-200 hover:bg-zinc-100 text-xs font-bold gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          View Photos ({req.requestedPhotoIds.length})
                        </Button>

                        {statusTab === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveClick(req)}
                              className="bg-primary text-primary-foreground h-9 rounded-xl text-xs font-black shadow-md shadow-primary/10"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectClick(req)}
                              className="h-9 border-zinc-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold rounded-xl"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {statusTab === "approved" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(req.downloadToken)}
                              className="h-9 border-zinc-200 hover:bg-zinc-100 text-xs font-bold rounded-xl gap-1.5"
                            >
                              <Copy className="h-4 w-4" />
                              Copy Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewHistoryClick(req)}
                              className="h-9 border-zinc-200 hover:bg-zinc-100 text-xs font-bold rounded-xl gap-1.5"
                            >
                              <Layers className="h-4 w-4 text-zinc-400" />
                              Downloads ({req.downloadCount || 0})
                            </Button>
                          </>
                        )}

                        {statusTab === "rejected" && (
                          <div className="text-right text-[10px] text-zinc-400 font-bold max-w-xs leading-normal">
                            <span className="text-red-500 font-black uppercase block mb-0.5">Rejected</span>
                            Reason: {req.rejectionReason}
                          </div>
                        )}

                        {statusTab === "expired" && (
                          <div className="text-right text-[10px] text-zinc-400 font-bold leading-normal">
                            <span className="text-amber-500 font-black uppercase block mb-0.5">Expired</span>
                            Access terminated
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 1. APPROVAL DIALOG */}
        <Modal
          isOpen={isApproveOpen}
          onClose={() => setIsApproveOpen(false)}
          title="Approve Download Link"
          description="A secure unique access link will be generated for this guest."
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Set Expiry Duration
              </label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value) as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs font-semibold focus-visible:outline-none focus:border-primary text-foreground"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Photographer Notes (Internal Only)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="E.g., Bride's cousin Rahul, verified match..."
                className="w-full min-h-[80px] p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsApproveOpen(false)}
                className="h-10 px-4 text-xs font-bold rounded-xl border-zinc-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveConfirm}
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-black bg-primary text-primary-foreground rounded-xl"
              >
                {isSubmitting ? "Generating Link..." : "Approve Link"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* 2. REJECTION DIALOG */}
        <Modal
          isOpen={isRejectOpen}
          onClose={() => setIsRejectOpen(false)}
          title="Reject Download Request"
          description="State the rejection explanation that will be logged on this request."
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <X className="h-4 w-4 text-red-500" /> Rejection Explanation (Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Selfies uploaded did not match this guest's faces, please try again."
                className="w-full min-h-[80px] p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Photographer Notes (Internal Only)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="E.g., Flagged: mismatched selfie faces"
                className="w-full min-h-[60px] p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsRejectOpen(false)}
                className="h-10 px-4 text-xs font-bold rounded-xl border-zinc-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-bold border border-zinc-200 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
              >
                {isSubmitting ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* 3. BULK APPROVAL DIALOG */}
        <Modal
          isOpen={isBulkApproveOpen}
          onClose={() => setIsBulkApproveOpen(false)}
          title={`Bulk Approve (${selectedIds.length} Requests)`}
          description="Approve and generate access tokens in batch."
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> Expiry Duration
              </label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value) as any)}
                className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs font-semibold focus-visible:outline-none focus:border-primary text-foreground"
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={168}>7 Days</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Internal Notes (Applied to all)
              </label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="E.g., Approved in batch review..."
                className="w-full min-h-[80px] p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsBulkApproveOpen(false)}
                className="h-10 px-4 text-xs font-bold rounded-xl border-zinc-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkApproveConfirm}
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-black bg-primary text-primary-foreground rounded-xl"
              >
                {isSubmitting ? "Processing..." : "Approve Selected"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* 4. BULK REJECTION DIALOG */}
        <Modal
          isOpen={isBulkRejectOpen}
          onClose={() => setIsBulkRejectOpen(false)}
          title={`Bulk Reject (${selectedIds.length} Requests)`}
          description="Reject selected requests in batch."
          className="max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <X className="h-4 w-4 text-red-500" /> Rejection Explanation (Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Batch reject: mismatch on selfie face verification"
                className="w-full min-h-[80px] p-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsBulkRejectOpen(false)}
                className="h-10 px-4 text-xs font-bold rounded-xl border-zinc-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkRejectConfirm}
                disabled={isSubmitting}
                className="h-10 px-5 text-xs font-bold border border-zinc-200 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
              >
                {isSubmitting ? "Processing..." : "Confirm Reject Selected"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* 5. PHOTOS VIEWER DIALOG */}
        <Modal
          isOpen={isPhotosOpen}
          onClose={() => setIsPhotosOpen(false)}
          title="Requested Photo List"
          description="Showing matched photos selected by this guest."
          className="max-w-2xl"
        >
          {isLoadingPhotos ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5">
              <LoadingSpinner className="h-6 w-6 text-primary animate-spin" />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Loading Photos...</p>
            </div>
          ) : photoPreviews.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No matching photos could be retrieved.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {photoPreviews.map((p) => {
                const src = p.secureUrl || p.asset?.secureUrl || p.asset?.url;
                const thumb = src ? src.replace("/upload/", "/upload/c_thumb,w_250,h_250,g_face,q_auto,f_auto/") : "";
                return (
                  <div key={p.id} className="relative aspect-square rounded-2xl border border-border overflow-hidden bg-zinc-900 group shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumb || src}
                      alt={p.originalFilename || "Request photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white">
                      <p className="text-[9px] font-bold truncate">{p.originalFilename}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>

        {/* 6. HISTORY DIALOG */}
        <Modal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          title="Download History & Session Logs"
          description="Verify guest download timestamps and browser signatures."
          className="max-w-lg"
        >
          {downloadHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Info className="h-6 w-6 text-zinc-400" />
              <p className="text-xs font-bold text-muted-foreground">No Downloads Tracked Yet</p>
              <p className="text-[10px] text-zinc-400 max-w-xs leading-normal">
                This secure session hasn&apos;t been accessed for downloading any assets yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {downloadHistory.map((h) => (
                <div key={h.id} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-border space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between items-center text-muted-foreground text-[10px]">
                    <span className="flex items-center gap-1 font-mono">
                      IP: {h.ip}
                    </span>
                    <span>
                      {h.downloadedAt?.toDate ? h.downloadedAt.toDate().toLocaleString() : "Just now"}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 font-medium font-mono text-[10px] truncate">
                    Browser/Device: {h.device}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Modal>

      </div>
    </PhotographerDashboardLayout>
  );
}
