"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  FolderKanban,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SquareCheck,
  Square,
  Sparkle
} from "lucide-react";
import { motion } from "framer-motion";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import { RoomCard } from "@/features/rooms/components/RoomCard";
import { DeleteRoomDialog } from "@/features/rooms/components/DeleteRoomDialog";
import { QRCodeCard } from "@/features/rooms/components/QRCodeCard";
import { toast } from "sonner";
import type { VirtualRoom, RoomStatus } from "@/types";

export default function RoomsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Data States
  const [rooms, setRooms] = React.useState<VirtualRoom[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | RoomStatus>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 6;

  // Dialog States
  const [deleteDialog, setDeleteDialog] = React.useState<{ isOpen: boolean; roomId: string; name: string }>({
    isOpen: false,
    roomId: "",
    name: "",
  });

  const [qrDialog, setQrDialog] = React.useState<{ isOpen: boolean; room: VirtualRoom | null }>({
    isOpen: false,
    room: null,
  });

  const [dupSuccessDialog, setDupSuccessDialog] = React.useState<{ isOpen: boolean; password: string; roomId: string }>({
    isOpen: false,
    password: "",
    roomId: "",
  });

  const [copied, setCopied] = React.useState(false);

  // Fetch rooms on load
  const loadRooms = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const fetched = await roomService.listByPhotographer(user.uid);
      setRooms(fetched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load virtual rooms");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Aggregate Counters
  const metrics = React.useMemo(() => {
    const totalRooms = rooms.length;
    const active = rooms.filter((r) => r.status === "active" || r.status === "live" || r.status === "upcoming").length;
    const completed = rooms.filter((r) => r.status === "completed").length;
    const totalVisitors = rooms.reduce((sum, r) => sum + (r.guestCount || 0), 0);
    const totalPhotos = rooms.reduce((sum, r) => sum + (r.photoCount || 0), 0);

    return { totalRooms, active, completed, totalVisitors, totalPhotos };
  }, [rooms]);

  // Filters & Search logic
  const filteredRooms = React.useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase()) || room.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        room.status === statusFilter ||
        (statusFilter === "active" && (room.status === "live" || room.status === "upcoming"));
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchQuery, statusFilter]);

  // Paginated rooms slice
  const paginatedRooms = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, currentPage]);

  const totalPages = Math.ceil(filteredRooms.length / pageSize) || 1;

  React.useEffect(() => {
    // Reset page if filters change
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentPageIds = paginatedRooms.map((r) => r.id);
    const allSelected = currentPageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Handlers
  const handleDuplicate = async (roomId: string) => {
    try {
      const result = await roomService.duplicateRoom(roomId);
      setDupSuccessDialog({
        isOpen: true,
        roomId: result.id,
        password: result.password,
      });
      loadRooms();
      toast.success("Room duplicated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate room");
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;
    try {
      await roomService.deleteRoom(deleteDialog.roomId, user.uid);
      toast.success("Virtual Room deleted");
      setSelectedIds((prev) => prev.filter((id) => id !== deleteDialog.roomId));
      loadRooms();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete virtual room");
    }
  };

  // Bulk operation actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !user) return;
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected rooms?`)) {
      try {
        await Promise.all(selectedIds.map((id) => roomService.deleteRoom(id, user.uid)));
        toast.success(`Successfully deleted ${selectedIds.length} rooms`);
        setSelectedIds([]);
        loadRooms();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete some rooms");
      }
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.length === 0) return;
    toast.loading(`Duplicating ${selectedIds.length} rooms...`);
    try {
      await Promise.all(selectedIds.map((id) => roomService.duplicateRoom(id)));
      toast.dismiss();
      toast.success(`Successfully duplicated ${selectedIds.length} rooms`);
      setSelectedIds([]);
      loadRooms();
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Failed to duplicate some rooms");
    }
  };

  const handleCopyDupPassword = async () => {
    try {
      await navigator.clipboard.writeText(dupSuccessDialog.password);
      setCopied(true);
      toast.success("Password copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const tabs: { label: string; value: "all" | RoomStatus }[] = [
    { label: "All Rooms", value: "all" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "Archived", value: "archived" },
  ];

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">

        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Event Rooms</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create, secure, and monitor virtual galleries for your photography shoots.
            </p>
          </div>
          <Link href="/dashboard/rooms/create" className="shrink-0">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 rounded-xl">
              <PlusCircle className="h-5 w-5" />
              Create Room
            </Button>
          </Link>
        </div>

        {/* Dashboard Aggregate Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="border border-border bg-card shadow-sm p-4 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Rooms</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.totalRooms}</p>
          </Card>
          <Card className="border border-border bg-card shadow-sm p-4 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 font-medium">Active Rooms</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.active}</p>
          </Card>
          <Card className="border border-border bg-card shadow-sm p-4 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Completed Rooms</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.completed}</p>
          </Card>
          <Card className="border border-border bg-card shadow-sm p-4 rounded-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Visitors</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.totalVisitors}</p>
          </Card>
          <Card className="border border-border bg-card shadow-sm p-4 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Photos</p>
            <p className="text-2xl font-extrabold text-foreground mt-1">{metrics.totalPhotos}</p>
          </Card>
        </div>

        {/* Filters and Navigation controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-border pt-4">

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80 shrink-0">
            {tabs.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Filters Panel */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search bar */}
            <div className="relative flex-grow max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-450 shrink-0" />
              <Input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border placeholder:text-zinc-450 text-xs focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
              />
            </div>

            {/* Bulk Selection Checkbox */}
            {paginatedRooms.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs font-bold gap-1.5 border-border rounded-xl"
              >
                {paginatedRooms.every((r) => selectedIds.includes(r.id)) ? (
                  <>
                    <SquareCheck className="h-4 w-4 text-primary" /> Deselect Page
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4 text-zinc-400" /> Select Page
                  </>
                )}
              </Button>
            )}
          </div>

        </div>

        {/* Floating Bulk Actions Panel */}
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3.5 bg-primary/5 border border-primary/20 rounded-xl"
          >
            <span className="text-xs font-extrabold text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? "room" : "rooms"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDuplicate}
                className="text-xs font-bold gap-1.5 border-primary/20 text-primary rounded-xl"
              >
                <Copy className="h-4 w-4" /> Duplicate Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-xs font-bold gap-1.5 border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl"
              >
                <Trash2 className="h-4 w-4" /> Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-xs font-bold text-muted-foreground"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}

        {/* Room Listing Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoadingSpinner className="h-8 w-8 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Retrieving event rooms...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/25 py-16 text-center max-w-md mx-auto rounded-2xl">
            <CardContent className="space-y-4">
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-foreground">No Rooms Found</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {searchQuery || statusFilter !== "all"
                    ? "Adjust your filters or search keywords to find other room configurations."
                    : "Initialize your first virtual event room to share photos with guests."}
                </p>
              </div>
              {(!searchQuery && statusFilter === "all") && (
                <Link href="/dashboard/rooms/create">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl">
                    Create First Room
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedRooms.map((room) => {
                const isSelected = selectedIds.includes(room.id);
                return (
                  <div key={room.id} className="relative group/wrapper">
                    {/* Multi-selection Checkbox Overlay */}
                    <button
                      onClick={() => handleToggleSelect(room.id)}
                      className="absolute top-3 left-16 z-20 h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors border border-white/10 backdrop-blur-sm flex items-center justify-center focus:outline-none"
                    >
                      {isSelected ? (
                        <SquareCheck className="h-4.5 w-4.5 text-primary fill-background" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-zinc-300" />
                      )}
                    </button>
                    <RoomCard
                      room={room}
                      onDuplicate={handleDuplicate}
                      onDelete={(roomId, name) => setDeleteDialog({ isOpen: true, roomId, name })}
                      onQRPreview={(room) => setQrDialog({ isOpen: true, room })}
                    />
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="h-8 w-8 p-0 border-border rounded-xl disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="h-8 w-8 p-0 border-border rounded-xl disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteRoomDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, roomId: "", name: "" })}
        onConfirm={handleDeleteConfirm}
        roomName={deleteDialog.name}
      />

      {/* QR Code Preview Modal */}
      <Modal
        isOpen={qrDialog.isOpen}
        onClose={() => setQrDialog({ isOpen: false, room: null })}
        className="max-w-md"
      >
        {qrDialog.room && (
          <QRCodeCard
            roomId={qrDialog.room.id}
            qrCodeUrl={qrDialog.room.qrCode.url}
            roomName={qrDialog.room.name}
          />
        )}
      </Modal>

      {/* Duplicate Room Success Modal (reveals password one-time-only) */}
      <Modal
        isOpen={dupSuccessDialog.isOpen}
        onClose={() => setDupSuccessDialog({ isOpen: false, password: "", roomId: "" })}
        title="Duplicated Room Credentials"
        description="Duplicate operation successfully set up your new event room."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-border bg-zinc-50 dark:bg-zinc-950/40 text-center space-y-3">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              New Room Access Password
            </label>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold font-mono tracking-widest text-primary bg-background border border-border px-4 py-2 rounded-lg select-all">
                {dupSuccessDialog.password}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyDupPassword}
                className="h-10 w-10 border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-850"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-zinc-400" />}
              </Button>
            </div>
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-2 text-left text-[10px]">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-normal">
                This password has been hashed and will NOT be shown again. Please save it immediately to access this room details screen later.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl"
              onClick={() => {
                // Unlock room session storage before route transition
                sessionStorage.setItem(`room-gate-unlocked-${dupSuccessDialog.roomId}`, "true");
                router.push(`/dashboard/rooms/${dupSuccessDialog.roomId}`);
              }}
            >
              Go to Room Details
            </Button>
          </div>
        </div>
      </Modal>
    </PhotographerDashboardLayout>
  );
}
