"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Calendar,
  MapPin,
  Camera,
  Mail,
  Phone,
  User,
  Users,
  Image as ImageIcon,
  Download,
  Share2,
  QrCode,
  Trash2,
  UploadCloud,
  ChevronLeft,
  Lock,
  Globe,
  Zap,
  Clock,
  Eye,
  RefreshCw,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { VirtualRoom, Booking, RoomStatus } from "@/types";
import { roomService } from "@/services/RoomService";
import { bookingService } from "@/services/BookingService";
import { photoService } from "@/services/PhotoService";
import { QRCodeCard } from "@/features/rooms/components/QRCodeCard";
import { PhotoUploader } from "@/features/gallery/components/PhotoUploader";
import { UploadQueue } from "@/features/gallery/components/UploadQueue";
import { db } from "@/lib/firebase/firestore";
import { collection, addDoc, Timestamp, serverTimestamp, updateDoc } from "firebase/firestore";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; color: string }
> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  live: { label: "Live", color: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" },
  upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  closed: { label: "Closed", color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
  archived: { label: "Archived", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  paused: { label: "Paused", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
};

export default function AdminRoomDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { roomId } = React.use(params);

  // Core States
  const [room, setRoom] = React.useState<VirtualRoom | null>(null);
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  // Modal / Dialog States
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  // Photo Uploader Selection states
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [targetRoomId, setTargetRoomId] = React.useState<string>("");

  const fetchRoomAndBookingData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const roomData = await roomService.getById(roomId);
      if (!roomData) {
        setRoom(null);
        return;
      }
      setRoom(roomData);

      // Resolve linked booking if present
      if (roomData.bookingId) {
        const bookingData = await bookingService.getById(roomData.bookingId);
        setBooking(bookingData);
      } else {
        setBooking(null);
      }
    } catch (err) {
      console.error("Error fetching room details:", err);
      toast.error("Failed to load virtual room and client details.");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    fetchRoomAndBookingData();
  }, [fetchRoomAndBookingData]);

  // Status Change Handler
  const handleStatusChange = async (newStatus: RoomStatus) => {
    if (!room) return;
    const actionLabel = newStatus === "paused" ? "pause" : newStatus === "closed" ? "close" : newStatus === "archived" ? "archive" : "update";
    if (!confirm(`Are you sure you want to ${actionLabel} this event room?`)) return;

    setIsSubmitting(true);
    try {
      const eventDateStr = room.eventDate ? room.eventDate.toDate().toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      await roomService.updateRoom(roomId, {
        name: room.name,
        description: room.description || "",
        eventType: room.eventType,
        eventDate: eventDateStr,
        eventTime: room.eventTime || "",
        allowGuestAccess: room.allowGuestAccess ?? true,
        requireFaceVerification: room.requireFaceVerification ?? false,
        allowDownloadRequests: room.allowDownloadRequests ?? true,
        autoCloseRoom: room.autoCloseRoom ?? false,
        autoCloseDate: room.autoCloseDate ? room.autoCloseDate.toDate().toISOString().split("T")[0] : undefined,
        visibility: room.visibility || "public",
        coverImage: room.coverImage || "",
        status: newStatus,
      });

      toast.success(`Room status updated to ${newStatus.toUpperCase()}`);
      fetchRoomAndBookingData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update room status");
    } finally {
      setIsSubmitting(false);
    }
  };

  // QR Code Regeneration
  const handleRegenerateQR = async () => {
    if (!room) return;
    if (!confirm("Are you sure you want to regenerate the QR code? This will update the QR code metadata.")) return;
    setIsSubmitting(true);
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snapevent.com";
      const roomUrl = `${appUrl}/event/${room.id}`;
      const newQrCode = {
        code: room.id.substring(0, 8).toUpperCase(),
        url: roomUrl,
        imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomUrl)}`,
        publicId: "",
        generatedAt: Timestamp.now(),
      };

      const roomRef = await roomService.getRoomRef(room.id);
      await updateDoc(roomRef, {
        qrCode: newQrCode,
        updatedAt: serverTimestamp(),
      });

      toast.success("QR Code successfully regenerated!");
      fetchRoomAndBookingData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate QR code");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share Room Handler
  const handleShareRoom = async () => {
    if (!room) return;
    const shareUrl = `${window.location.origin}/event/${room.id}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: room.name,
          text: `Join the event room gallery for ${room.name}!`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        toast.success("Public event gallery link copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2500);
      }
    } catch (err) {
      console.error("Share failed:", err);
      // Fallback copy if share dialog was cancelled or failed
      try {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setIsCopied(false), 2500);
      } catch (copyErr) {
        console.error("Clipboard copy failed:", copyErr);
      }
    }
  };

  // Download Gallery ZIP Handler
  const handleDownloadGallery = async () => {
    if (!room) return;
    setIsSubmitting(true);
    try {
      // 1. Fetch all photo records for this room
      toast.loading("Retrieving gallery photo collection...");
      const photosRes = await photoService.listByRoom(room.id, {}, 1000);
      const photoIds = photosRes.data.map((p) => p.id);

      if (photoIds.length === 0) {
        toast.dismiss();
        toast.warning("This gallery does not contain any photos to download.");
        return;
      }

      // 2. Create a temporary pre-approved download request token
      toast.loading("Preparing secure ZIP download package...");
      const tempToken = "admin_dl_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      await addDoc(collection(db, "download_requests"), {
        roomId: room.id,
        photographerId: room.photographerId,
        customerId: "admin",
        customerName: "System Administrator",
        customerPhone: "N/A",
        customerEmail: "admin@snapevent.com",
        requestedPhotoIds: photoIds,
        approvedPhotoIds: photoIds,
        rejectedPhotoIds: [],
        matchedPhotoIds: [],
        matchConfidence: 1.0,
        status: "approved",
        downloadExpiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)), // 15 mins expiry
        downloadToken: tempToken,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.dismiss();
      toast.success("Redirecting to download secure ZIP archive!");
      
      // 3. Redirect to the download api route containing token
      window.location.href = `/api/gallery/download-zip?token=${tempToken}`;
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to generate zip gallery bundle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Room Deletion
  const handleDeleteConfirm = async () => {
    if (!room) return;
    setIsSubmitting(true);
    try {
      await roomService.deleteRoomAdmin(room.id);
      toast.success("Room registry deleted successfully!");
      setIsDeleteOpen(false);
      router.push("/admin/rooms");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete room registry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo Uploader handlers
  const handleFilesSelected = (files: File[], roomId: string) => {
    setSelectedFiles(files);
    setTargetRoomId(roomId);
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setTargetRoomId("");
  };

  const handleUploadComplete = () => {
    toast.success("Photos uploaded successfully!");
    fetchRoomAndBookingData();
    setTimeout(() => {
      handleClearFiles();
      setIsUploadModalOpen(false);
    }, 2000);
  };

  // UI Date Format Helpers
  const formatTimestamp = (ts?: Timestamp) => {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return new Date(ts.toDate()).toLocaleDateString("en-US", {
      dateStyle: "medium",
    });
  };

  // Render Loading Spinner
  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Retrieving registry records...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  // Render Missing/Error Room Details
  if (!room) {
    return (
      <AdminDashboardLayout>
        <div className="space-y-6">
          <Link href="/admin/rooms" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to registries
          </Link>
          <Card className="bg-card border-red-500/10 text-center py-20">
            <CardContent className="space-y-3">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h2 className="text-lg font-bold text-foreground">Room Registry Not Found</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                The virtual event room registry with ID <span className="font-mono bg-secondary px-1 py-0.5 rounded text-red-500 font-bold">{roomId}</span> does not exist or has been deleted.
              </p>
              <Link href="/admin/rooms" className="inline-block mt-2">
                <Button size="sm">Return to Rooms List</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AdminDashboardLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG["closed"];

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        {/* Navigation / Back */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/rooms" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to registries
          </Link>
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-secondary border border-border px-3 py-1 rounded-full">
            Admin Management Override
          </span>
        </div>

        {/* Room Header Info */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="space-y-1.5 flex-grow">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px] font-bold">
                {room.eventType}
              </Badge>
              <Badge className={statusCfg.color}>
                {room.status.toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {room.name}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {room.description || "No description provided."}
            </p>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                Event Date: {formatTimestamp(room.eventDate)} {room.eventTime ? `@ ${room.eventTime}` : ""}
              </span>
              {room.eventLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  Location: {room.eventLocation.street ? `${room.eventLocation.street}, ` : ""}{room.eventLocation.city}, {room.eventLocation.state}
                </span>
              )}
            </div>
          </div>

          {/* Top Quick Status Transitions */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {room.status !== "active" && room.status !== "live" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("active")}
                className="text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/20 text-xs font-bold"
              >
                Activate
              </Button>
            )}
            {room.status !== "closed" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("closed")}
                className="text-slate-500 hover:bg-slate-500/10 border-slate-550/20 text-xs font-bold"
              >
                Close
              </Button>
            )}
            {room.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("archived")}
                className="text-yellow-600 hover:bg-yellow-500/10 border-yellow-600/20 text-xs font-bold"
              >
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Metadata Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Room Metadata Card */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FolderOpen className="h-4.5 w-4.5 text-primary" />
                  Room Details
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-semibold">
                  Event room configurations and database records
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-border/60 text-xs">
                <div className="grid grid-cols-3 py-2.5 items-center">
                  <span className="text-muted-foreground font-semibold">Room ID</span>
                  <span className="col-span-2 font-mono flex items-center justify-between bg-secondary/40 border border-border/50 px-2 py-1 rounded">
                    {room.id}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(room.id);
                        toast.success("Room ID copied to clipboard!");
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-secondary p-0.5 rounded transition-all ml-2"
                      title="Copy ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Visibility</span>
                  <span className="col-span-2 font-bold capitalize flex items-center gap-1.5 text-foreground">
                    {room.visibility === "private" ? (
                      <><Lock className="h-3 w-3 text-red-500" /> Private Room</>
                    ) : (
                      <><Globe className="h-3 w-3 text-green-500" /> Public Room</>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Created Date</span>
                  <span className="col-span-2 text-foreground font-medium">{formatTimestamp(room.createdAt)}</span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Last Updated</span>
                  <span className="col-span-2 text-foreground font-medium">{formatTimestamp(room.updatedAt)}</span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Guest Access Mode</span>
                  <span className="col-span-2 text-foreground font-medium flex items-center gap-1.5">
                    {room.allowGuestUpload ? (
                      <span className="text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-[10px] font-bold">UPLOADS ALLOWED</span>
                    ) : (
                      <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded text-[10px] font-bold">READ ONLY</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Face Verification</span>
                  <span className="col-span-2 text-foreground font-medium">
                    {room.requireFaceVerification ? (
                      <span className="text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px] font-bold">REQUIRED</span>
                    ) : (
                      <span className="text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] font-bold">OPTIONAL</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Client Info Card */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-pink-500" />
                  Client Information
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-semibold">
                  Contact profiles resolved from linked booking requests
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-border/60 text-xs">
                {booking ? (
                  <>
                    <div className="grid grid-cols-3 py-2.5">
                      <span className="text-muted-foreground font-semibold">Client Name</span>
                      <span className="col-span-2 text-foreground font-bold flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        {booking.customerName}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 py-2.5">
                      <span className="text-muted-foreground font-semibold">Client Email</span>
                      <span className="col-span-2 text-foreground font-medium flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <a href={`mailto:${booking.customerEmail}`} className="hover:text-primary transition-colors hover:underline">
                          {booking.customerEmail}
                        </a>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 py-2.5">
                      <span className="text-muted-foreground font-semibold">Client Phone</span>
                      <span className="col-span-2 text-foreground font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        {booking.customerPhone ? (
                          <a href={`tel:${booking.customerPhone}`} className="hover:text-primary transition-colors hover:underline">
                            {booking.customerPhone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 py-2.5">
                      <span className="text-muted-foreground font-semibold">Linked Booking</span>
                      <span className="col-span-2 text-foreground font-medium flex items-center gap-2">
                        <Link href={`/admin/bookings?bookingId=${booking.id}`} className="text-primary hover:underline font-bold">
                          {booking.id.substring(0, 8).toUpperCase()}...
                        </Link>
                        <Badge className="bg-green-500/10 text-green-500 text-[9px] font-black tracking-wide uppercase px-1.5 py-0.5">
                          {booking.status}
                        </Badge>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <User className="h-7 w-7 text-muted-foreground/30 mx-auto mb-1.5" />
                    <p className="font-bold text-xs">Direct Room Registry</p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">No client booking profile linked to this virtual room.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Photographer Card */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Camera className="h-4.5 w-4.5 text-indigo-500" />
                  Photographer Owner
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-semibold">
                  Studio profile linked to this virtual room management
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 divide-y divide-border/60 text-xs">
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Name</span>
                  <span className="col-span-2 text-foreground font-bold flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {room.photographerName}
                  </span>
                </div>
                <div className="grid grid-cols-3 py-2.5">
                  <span className="text-muted-foreground font-semibold">Photographer ID</span>
                  <span className="col-span-2 text-foreground font-mono font-medium flex items-center gap-1.5">
                    {room.photographerId}
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Actions, Metrics, and QR Code */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Metrics */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  Room Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-3.5">
                <div className="bg-secondary/45 border border-border/70 rounded-xl p-3 shadow-inner">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Photo Count</p>
                  <p className="text-lg font-black text-pink-500 mt-1 flex items-center gap-1">
                    <ImageIcon className="h-4.5 w-4.5" />
                    {room.photoCount}
                  </p>
                </div>
                <div className="bg-secondary/45 border border-border/70 rounded-xl p-3 shadow-inner">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Total Guests</p>
                  <p className="text-lg font-black text-blue-500 mt-1 flex items-center gap-1">
                    <Users className="h-4.5 w-4.5" />
                    {room.guestCount}
                  </p>
                </div>
                <div className="bg-secondary/45 border border-border/70 rounded-xl p-3 shadow-inner">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Gallery Views</p>
                  <p className="text-lg font-black text-amber-500 mt-1 flex items-center gap-1">
                    <Eye className="h-4.5 w-4.5" />
                    {room.galleryViews || 0}
                  </p>
                </div>
                <div className="bg-secondary/45 border border-border/70 rounded-xl p-3 shadow-inner">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Downloads</p>
                  <p className="text-lg font-black text-emerald-500 mt-1 flex items-center gap-1">
                    <Download className="h-4.5 w-4.5" />
                    {room.downloadRequestCount || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold">Room Console</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col gap-2">
                
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full h-9 justify-start gap-2.5 font-semibold text-xs text-white"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Photos
                </Button>

                <a href={`/event/${room.id}`} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start gap-2.5 font-semibold text-xs border-border hover:bg-secondary"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    View Live Room
                  </Button>
                </a>

                <Button
                  variant="outline"
                  onClick={handleDownloadGallery}
                  disabled={isSubmitting}
                  className="w-full h-9 justify-start gap-2.5 font-semibold text-xs border-border hover:bg-secondary"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Download Gallery ZIP
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShareRoom}
                  className="w-full h-9 justify-start gap-2.5 font-semibold text-xs border-border hover:bg-secondary"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  )}
                  Share Room Link
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRegenerateQR}
                  disabled={isSubmitting}
                  className="w-full h-9 justify-start gap-2.5 font-semibold text-xs border-border hover:bg-secondary text-indigo-500 hover:text-indigo-600"
                >
                  <QrCode className="h-4 w-4 shrink-0" />
                  Regenerate QR
                </Button>

                <div className="border-t border-border/80 pt-2 mt-2">
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                    className="w-full h-9 justify-start gap-2.5 font-bold text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete Room
                  </Button>
                </div>

              </CardContent>
            </Card>

            {/* QR Code Cards display */}
            <QRCodeCard roomId={room.id} qrCodeUrl={room.qrCode.url} roomName={room.name} />

          </div>

        </div>

      </div>

      {/* MODAL: PHOTO UPLOADER */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (selectedFiles.length > 0) {
            if (!confirm("Your pending upload queue will be cleared. Do you want to close?")) return;
          }
          handleClearFiles();
          setIsUploadModalOpen(false);
        }}
        title="Admin Photo Uploader"
        description="Distribute high-resolution photographs into Cloudinary CDN folders for this room"
        className="max-w-2xl"
      >
        <div className="mt-2 space-y-4">
          {selectedFiles.length === 0 ? (
            <PhotoUploader
              onFilesSelected={handleFilesSelected}
              initialRoomId={room.id}
            />
          ) : (
            <UploadQueue
              files={selectedFiles}
              roomId={room.id}
              onClear={handleClearFiles}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </div>
      </Modal>

      {/* MODAL: DELETE ROOM CONFIRM */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Room Registry"
        description="Are you absolutely sure you want to delete this virtual room registry?"
      >
        <div className="space-y-4 mt-2 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/20 text-red-800 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Warning: This action is permanent!</p>
              <p className="mt-0.5 leading-relaxed text-muted-foreground">
                Deleting this room will remove the database index and decrement photographer statistics. Active uploads, QR codes, and custom configurations will become invalid. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs font-semibold hover:bg-secondary"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="text-xs font-bold"
            >
              {isSubmitting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Modal>

    </AdminDashboardLayout>
  );
}
