"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Image as ImageIcon,
  FileDown,
  QrCode,
  Settings,
  FolderOpen,
  Users,
  Star,
  Clock,
  Calendar,
  Database,
  Shield,
  UploadCloud,
  Share2,
  Edit2,
  Trash2,
  Copy,
  Check,
  Plus,
  Play,
  Pause,
  XOctagon,
  Eye,
  Info,
  MapPin,
  Mail,
  Loader,
  X,
  CheckCircle,
  XCircle,
  ChevronLeft,
  CalendarDays,
  User,
  Save
} from "lucide-react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import { photoService } from "@/services/PhotoService";
import { bookingService } from "@/services/BookingService";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, onSnapshot, serverTimestamp, doc } from "firebase/firestore";
import { CreateRoomFormSchema, type ValidatedCreateRoomForm } from "@/features/rooms/schemas";

// Gallery & Upload component imports
import GalleryToolbar from "@/features/gallery/components/GalleryToolbar";
import GalleryGrid from "@/features/gallery/components/GalleryGrid";
import BulkActionBar from "@/features/gallery/components/BulkActionBar";
import PhotoViewer from "@/features/gallery/components/PhotoViewer";
import RoomPhotoUploader from "@/features/gallery/components/RoomPhotoUploader";
import RoomUploadQueue from "@/features/gallery/components/RoomUploadQueue";
import {
  useGalleryPhotos,
  useToggleFavoriteMutation,
  useSoftDeletePhotosMutation,
  useRenamePhotoMutation,
  useMovePhotosMutation,
  useCreateAlbumMutation,
  useDeleteAlbumMutation
} from "@/features/gallery/hooks/useGallery";
import { QRCodeCard } from "@/features/rooms/components/QRCodeCard";
import { RoomSecurityDialog } from "@/features/rooms/components/RoomSecurityDialog";
import { DeleteRoomDialog } from "@/features/rooms/components/DeleteRoomDialog";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import type { VirtualRoom, Photo, DownloadRequest, RoomStatus, Booking } from "@/types";

// Modular Workspace Tab Components
import { OverviewTab } from "@/features/workspace/tabs/OverviewTab";
import { PhotosTab } from "@/features/workspace/tabs/PhotosTab";
import { AlbumsTab } from "@/features/workspace/tabs/AlbumsTab";
import { GuestsTab } from "@/features/workspace/tabs/GuestsTab";
import { DownloadsTab } from "@/features/workspace/tabs/DownloadsTab";
import { QRTab } from "@/features/workspace/tabs/QRTab";
import { SettingsTab } from "@/features/workspace/tabs/SettingsTab";

// Helper to compute expiry date outside component render scope to satisfy purity compiler checks.
function getExpiryDate(): Date {
  return new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hrs expiry
}

function generateToken(): string {
  return "dl_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface PageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function RoomDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Dynamic Route params
  const { roomId } = React.use(params);

  // Verification & Lock States
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [room, setRoom] = React.useState<VirtualRoom | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = React.useState(true);

  // Booking & Dynamic Stats States
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = React.useState(false);
  const [roomStats, setRoomStats] = React.useState({
    photoCount: 0,
    storageUsed: 0,
    guestCount: 0,
    downloads: 0,
    favorites: 0,
    lastUpload: null as Date | null,
    aiIndexedCount: 0,
  });

  // Tab State: 7 Tabs redesign
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "photos" | "albums" | "guests" | "qr" | "downloads" | "settings"
  >("overview");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (
        tabParam &&
        ["overview", "photos", "albums", "guests", "qr", "downloads", "settings"].includes(tabParam)
      ) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Gallery Toolbar, Filtering, Selection and Upload States
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "masonry" | "list">("grid");
  const [albumId, setAlbumId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState("newest");
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadFiles, setUploadFiles] = React.useState<File[]>([]);
  const [viewerState, setViewerState] = React.useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  // New Album Input State (Settings & Category Manager)
  const [newAlbumName, setNewAlbumName] = React.useState("");

  // Dialog States
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [rejectDialog, setRejectDialog] = React.useState<{ isOpen: boolean; reqId: string; reason: string }>({
    isOpen: false,
    reqId: "",
    reason: "",
  });
  const [dupSuccessDialog, setDupSuccessDialog] = React.useState<{ isOpen: boolean; password: string; roomId: string }>({
    isOpen: false,
    password: "",
    roomId: "",
  });
  const [copied, setCopied] = React.useState(false);

  // Storage keys
  const unlockedKey = `room-gate-unlocked-${roomId}`;

  // React Hook Form for Room settings edit
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(CreateRoomFormSchema),
    defaultValues: {
      name: "",
      eventType: "wedding",
      eventDate: "",
      eventTime: "",
      eventLocation: {
        street: "",
        city: "",
        state: "",
        country: "India",
        postalCode: "",
      },
      description: "",
      allowGuestAccess: true,
      requireFaceVerification: false,
      allowDownloadRequests: true,
      autoCloseRoom: false,
      autoCloseDate: "",
      visibility: "public",
    },
  });

  const formErrors = errors as any;
  const watchAutoCloseRoom = watch("autoCloseRoom");

  // Real-Time Activity Streams for Overview Tab
  const [realtimeActivity, setRealtimeActivity] = React.useState<{
    uploads: any[];
    downloads: any[];
    guests: any[];
    aiProcessed: any[];
    favorites: any[];
  }>({
    uploads: [],
    downloads: [],
    guests: [],
    aiProcessed: [],
    favorites: [],
  });

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Sub-data States
  const [requests, setRequests] = React.useState<DownloadRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = React.useState(false);

  // Fetch Room Info
  const fetchRoomInfo = React.useCallback(async () => {
    setIsLoadingRoom(true);
    try {
      const data = await roomService.getById(roomId);
      if (!data) {
        toast.error("Event Room not found.");
        router.push("/dashboard/rooms");
        return;
      }
      // Security role check
      const isAdminUser = user?.role === "admin";
      if (user && data.photographerId !== user.uid && !isAdminUser) {
        toast.error("Access denied. You do not have permission to manage this room.");
        router.push("/dashboard/rooms");
        return;
      }
      setRoom(data);

      // Populate Form Values
      const dt = data.eventDate ? data.eventDate.toDate() : new Date();
      const dateStr = dt.toISOString().split("T")[0];
      const timeStr = data.eventTime || dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setValue("name", data.name);
      setValue("eventType", data.eventType);
      setValue("eventDate", dateStr);
      setValue("eventTime", timeStr);
      setValue("description", data.description || "");
      setValue("coverImage", data.coverImage || "");
      setValue("allowGuestAccess", data.allowGuestAccess ?? true);
      setValue("requireFaceVerification", data.requireFaceVerification ?? false);
      setValue("allowDownloadRequests", data.allowDownloadRequests ?? true);
      setValue("autoCloseRoom", data.autoCloseRoom ?? false);

      if (data.autoCloseDate) {
        const closeDateStr = data.autoCloseDate.toDate().toISOString().split("T")[0];
        setValue("autoCloseDate", closeDateStr);
      }

      setValue("visibility", data.visibility || "public");

      if (data.eventLocation) {
        setValue("eventLocation.street", data.eventLocation.street || "");
        setValue("eventLocation.city", data.eventLocation.city);
        setValue("eventLocation.state", data.eventLocation.state);
        setValue("eventLocation.country", data.eventLocation.country);
        setValue("eventLocation.postalCode", data.eventLocation.postalCode || "");
      }

      // Fetch booking if exists
      if (data.bookingId) {
        setIsLoadingBooking(true);
        try {
          const bookingData = await bookingService.getById(data.bookingId);
          setBooking(bookingData);
        } catch (bookingErr) {
          console.error("Failed to load booking details for room:", bookingErr);
        } finally {
          setIsLoadingBooking(false);
        }
      } else {
        setBooking(null);
      }

      // Fetch dynamic stats from photos
      try {
        const q = query(
          collection(db, "photos"),
          where("roomId", "==", roomId),
          where("isDeleted", "==", false)
        );
        const snaps = await getDocs(q);
        const roomPhotos = snaps.docs.map((doc) => doc.data());

        let storageSum = 0;
        let downloadSum = 0;
        let favoriteCount = 0;
        let aiIndexedCount = 0;
        let lastUploadTime: Date | null = null;

        roomPhotos.forEach((p) => {
          storageSum += (p.fileSize || p.size || 0);
          downloadSum += (p.downloadCount || 0);
          if (p.favorite) {
            favoriteCount += 1;
          }
          if (p.isProcessed) {
            aiIndexedCount += 1;
          }
          const t = p.createdAt || p.uploadTime;
          if (t) {
            const timeVal = typeof t.toMillis === "function" ? t.toMillis() : new Date(t).getTime();
            if (!lastUploadTime || timeVal > lastUploadTime.getTime()) {
              lastUploadTime = new Date(timeVal);
            }
          }
        });

        setRoomStats({
          photoCount: roomPhotos.length,
          storageUsed: storageSum,
          guestCount: data.guestCount || 0,
          downloads: downloadSum,
          favorites: favoriteCount,
          lastUpload: lastUploadTime,
          aiIndexedCount: aiIndexedCount,
        });
      } catch (statsErr) {
        console.error("Failed to compile room photo statistics:", statsErr);
      }

      // Auto-unlock check
      const sessionUnlocked = sessionStorage.getItem(unlockedKey) === "true";
      if (sessionUnlocked) {
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load room details");
    } finally {
      setIsLoadingRoom(false);
    }
  }, [roomId, user, router, unlockedKey, setValue]);

  React.useEffect(() => {
    fetchRoomInfo();
  }, [fetchRoomInfo]);

  // Load download requests for Guests and Downloads tabs
  const fetchRequests = React.useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await downloadRequestService.listByRoom(roomId, {}, 50);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to retrieve download requests");
    } finally {
      setIsLoadingRequests(false);
    }
  }, [roomId]);

  // Load sub-data on tab changes
  React.useEffect(() => {
    if (activeTab === "downloads" || activeTab === "guests") {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  // Query photos via React Query hook for infinite scrolling in Photos Tab
  const {
    data: photosData,
    isLoading: isLoadingPhotos,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchPhotos,
  } = useGalleryPhotos(
    roomId,
    {
      albumId,
      favorite: onlyFavorites,
      search: debouncedSearch,
      sortBy,
    },
    30
  );

  const photos = photosData?.pages.flatMap((page: any) => page.data) || [];

  // Recent Uploads Feed query (limit 12)
  const { data: recentPhotosData } = useGalleryPhotos(roomId, { sortBy: "newest" }, 12);
  const recentPhotos = recentPhotosData?.pages.flatMap((page: any) => page.data) || [];

  // Real-Time Listener on single photos feed (in-memory sorting/slicing for 4 categories)
  React.useEffect(() => {
    if (!roomId || !isUnlocked) return;

    const qPhotos = query(
      collection(db, "photos"),
      where("roomId", "==", roomId),
      where("isDeleted", "==", false)
    );

    const unsubPhotos = onSnapshot(
      qPhotos,
      (snap) => {
        const allPhotos = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

        // Sort by createdAt desc
        const sortedPhotos = [...allPhotos].sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        // 1. Recent uploads
        const uploads = sortedPhotos.slice(0, 5);

        // 2. Recent favorites
        const favorites = sortedPhotos.filter((p: any) => p.favorite === true).slice(0, 5);

        // 3. AI Processed
        const aiProcessed = sortedPhotos.filter((p: any) => p.isProcessed === true).slice(0, 5);

        // 4. Recent Downloads (photos where downloadCount > 0, sorted by downloadCount desc)
        const downloads = [...sortedPhotos]
          .filter((p: any) => (p.downloadCount || 0) > 0)
          .sort((a: any, b: any) => (b.downloadCount || 0) - (a.downloadCount || 0))
          .slice(0, 5);

        setRealtimeActivity((prev) => ({
          ...prev,
          uploads,
          favorites,
          aiProcessed,
          downloads,
        }));
      },
      (err) => {
        console.error("Overview photo subscription failed:", err);
      }
    );

    // 5. Guest activity (Download requests log)
    const qGuests = query(
      collection(db, "downloadRequests"),
      where("roomId", "==", roomId)
    );

    const unsubGuests = onSnapshot(
      qGuests,
      (snap) => {
        const fetchedGuests = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        const sortedGuests = fetchedGuests.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setRealtimeActivity((prev) => ({
          ...prev,
          guests: sortedGuests.slice(0, 5),
        }));
      },
      (err) => {
        console.error("Overview guest subscription failed:", err);
      }
    );

    return () => {
      unsubPhotos();
      unsubGuests();
    };
  }, [roomId, isUnlocked]);

  // Mutations
  const toggleFavorite = useToggleFavoriteMutation(roomId);
  const softDelete = useSoftDeletePhotosMutation(roomId, user?.uid || "");
  const renamePhoto = useRenamePhotoMutation(roomId);
  const movePhotos = useMovePhotosMutation(roomId);
  const createAlbum = useCreateAlbumMutation(roomId);
  const deleteAlbum = useDeleteAlbumMutation(roomId);

  const handleSelectPhoto = (photoId: string, selected: boolean) => {
    if (selected) {
      setSelectedIds((prev) => [...prev, photoId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== photoId));
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(photos.map((p: any) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleFavoriteSingle = (photo: any) => {
    toggleFavorite.mutate({ photoId: photo.id, favorite: !photo.favorite });
  };

  const handleDeleteSingle = (photo: any) => {
    if (confirm(`Move "${photo.fileName}" to trash bin?`)) {
      softDelete.mutate([photo.id]);
    }
  };

  const handleRenameSingle = (photo: any) => {
    const newName = prompt("Rename File:", photo.fileName);
    if (newName && newName.trim() && newName.trim() !== photo.fileName) {
      renamePhoto.mutate({ photoId: photo.id, newName: newName.trim() });
    }
  };

  const handleMoveSingle = (photo: any, albumName: string | null) => {
    movePhotos.mutate({ photoIds: [photo.id], albumId: albumName });
  };

  // Bulk Operations
  const handleBulkFavorite = () => {
    const selectedPhotos = photos.filter((p: any) => selectedIds.includes(p.id));
    const allFav = selectedPhotos.every((p: any) => p.favorite);
    const targetState = !allFav;

    selectedIds.forEach((id) => {
      toggleFavorite.mutate({ photoId: id, favorite: targetState });
    });
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (confirm(`Move all ${selectedIds.length} selected photos to trash?`)) {
      softDelete.mutate(selectedIds, {
        onSuccess: () => setSelectedIds([]),
      });
    }
  };

  const handleBulkMove = (albumName: string | null) => {
    movePhotos.mutate(
      { photoIds: selectedIds, albumId: albumName },
      { onSuccess: () => setSelectedIds([]) }
    );
  };

  // Settings Save Submit
  const handleSettingsSubmit = async (data: any) => {
    setIsSavingSettings(true);
    try {
      await roomService.updateRoom(roomId, data, user?.uid);
      toast.success("Room configurations updated successfully");
      fetchRoomInfo();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update room configurations");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [isSavingSettings, setIsSavingSettings] = React.useState(false);

  // Actions
  const handleShareRoom = async () => {
    const shareUrl = `${window.location.origin}/event/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: room?.name || "Shared Event Room",
          text: `Check out the photos from ${room?.name}!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Public event link copied to clipboard!");
    }
  };

  const handleLockRoom = () => {
    sessionStorage.removeItem(unlockedKey);
    setIsUnlocked(false);
    toast.info("Room session locked.");
  };

  const handleDuplicate = async () => {
    if (!confirm("Are you sure you want to duplicate this event room's configuration?")) return;
    try {
      const result = await roomService.duplicateRoom(roomId);
      setDupSuccessDialog({
        isOpen: true,
        roomId: result.id,
        password: result.password,
      });
      toast.success("Room duplicated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to duplicate room");
    }
  };

  const handleUpdateStatus = async (newStatus: RoomStatus) => {
    if (!room) return;
    const actionLabel = newStatus === "paused" ? "pause" : newStatus === "closed" ? "close" : newStatus === "archived" ? "archive" : "update";
    if (!confirm(`Are you sure you want to ${actionLabel} this event room?`)) return;

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
      }, user?.uid || undefined);

      toast.success(`Room status updated to ${newStatus.toUpperCase()}`);
      fetchRoomInfo();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update room status: ${err}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;
    try {
      await roomService.deleteRoom(roomId, user.uid);
      toast.success("Room deleted successfully");
      router.push("/dashboard/rooms");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete room");
    }
  };

  const handleApproveRequest = async (req: DownloadRequest) => {
    if (!user) return;
    try {
      const expiresAt = getExpiryDate();
      const token = generateToken();
      await downloadRequestService.approve(
        req.id,
        req.requestedPhotoIds,
        expiresAt,
        user.uid,
        token,
        "Approved from room details dashboard"
      );
      toast.success(`Download request approved for ${req.customerName}`);
      fetchRequests();
      fetchRoomInfo();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve download request");
    }
  };

  const handleRejectRequestSubmit = async () => {
    if (!user) return;
    try {
      await downloadRequestService.reject(rejectDialog.reqId, rejectDialog.reason || "Selfie verification did not match", user.uid);
      toast.success("Download request rejected");
      setRejectDialog({ isOpen: false, reqId: "", reason: "" });
      fetchRequests();
      fetchRoomInfo();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
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

  // Create Album Action
  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;

    if ((room?.albums || []).includes(name)) {
      setNewAlbumName("");
      toast.error("Album already exists.");
      return;
    }

    await createAlbum.mutateAsync(name);
    setNewAlbumName("");
    fetchRoomInfo();
  };

  const handleDeleteAlbum = async (albumName: string) => {
    if (confirm(`Are you sure you want to delete the album "${albumName}"? All photos in this album will be moved to unassigned.`)) {
      await deleteAlbum.mutateAsync(albumName);
      fetchRoomInfo();
    }
  };

  // Helper selectors
  const formatStorage = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatLastUpload = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  // Custom Skeleton Loaders
  if (isLoadingRoom) {
    return (
      <PhotographerDashboardLayout>
        <div className="space-y-6">
          {/* Skeleton Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-6 border-b border-border">
            <div className="space-y-2.5 flex-grow">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-8 w-1/3" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          {/* Skeleton Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="p-4 border border-border bg-card">
                <Skeleton className="h-4.5 w-2/3" />
                <Skeleton className="h-8 w-1/2 mt-3" />
              </Card>
            ))}
          </div>

          {/* Skeleton Gallery / Details */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="aspect-square rounded-2xl w-full" />
              ))}
            </div>
          </div>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  // Security Lock Check
  if (!isUnlocked) {
    return (
      <RoomSecurityDialog
        roomId={roomId}
        correctPasswordHash={room?.passwordHash}
        onVerified={() => setIsUnlocked(true)}
      />
    );
  }

  const eventDateStr = room?.eventDate
    ? room.eventDate.toDate().toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const locationStr = room?.eventLocation
    ? `${room.eventLocation.street ? room.eventLocation.street + ", " : ""}${room.eventLocation.city}, ${room.eventLocation.state}, ${room.eventLocation.country}`
    : "Virtual Shoot";

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">
        
        {/* PART 10: Workspace Header */}
        <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between md:gap-6 select-none">
          <div className="space-y-1.5 flex-grow">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px] font-bold">
                {room?.eventType}
              </Badge>
              <Badge
                className={
                  room?.status === "live"
                    ? "bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse"
                    : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                }
              >
                {room?.status?.toUpperCase()}
              </Badge>
              {(room as any)?.password && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-900/60 px-2.5 py-0.5 rounded-full border border-border">
                  <span className="font-bold uppercase tracking-wider">Access:</span>
                  <span className="font-mono font-bold text-foreground select-all">{(room as any).password}</span>
                </div>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              {room?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {eventDateStr}
              </span>
              {locationStr && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {locationStr}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Guest Portal */}
            <a href={`/event/${roomId}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-secondary">
                <Share2 className="h-4 w-4 text-primary" />
                Guest Portal
              </Button>
            </a>

            {/* QR Card */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("qr")}
              className="gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-secondary"
            >
              <QrCode className="h-4 w-4 text-primary" />
              QR Poster
            </Button>

            {/* Upload Photos */}
            <Button
              onClick={() => {
                setActiveTab("overview");
                setIsUploading(true);
              }}
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10"
            >
              <UploadCloud className="h-4 w-4" />
              Upload Photos
            </Button>

            {/* Settings */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("settings")}
              className="gap-2 border-zinc-200 dark:border-zinc-800 hover:bg-secondary"
            >
              <Settings className="h-4 w-4 text-zinc-500" />
              Settings
            </Button>
          </div>
        </div>

        {/* Workspace 7 Tabs Redesign */}
        <div className="flex border-b border-border gap-1 overflow-x-auto pt-1 pb-px shrink-0 select-none no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "overview"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "photos"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Photos ({roomStats.photoCount})
          </button>

          <button
            onClick={() => setActiveTab("albums")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "albums"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Albums ({(room?.albums || []).length})
          </button>

          <button
            onClick={() => setActiveTab("guests")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "guests"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Guests ({roomStats.guestCount})
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "qr"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </button>

          <button
            onClick={() => setActiveTab("downloads")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "downloads"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileDown className="h-4 w-4" />
            Downloads ({requests.filter((r) => r.status === "pending").length})
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "settings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        {/* Tab Contents Layout */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            
            {activeTab === "overview" && room && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <OverviewTab
                  room={room}
                  roomStats={roomStats}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  uploadFiles={uploadFiles}
                  setUploadFiles={setUploadFiles}
                  photos={photos}
                  recentPhotos={recentPhotos}
                  realtimeActivity={realtimeActivity}
                  roomId={roomId}
                  refetchPhotos={refetchPhotos}
                  fetchRoomInfo={fetchRoomInfo}
                />
              </motion.div>
            )}

            {activeTab === "photos" && room && (
              <motion.div
                key="photos-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <PhotosTab
                  room={room}
                  photos={photos}
                  search={search}
                  setSearch={setSearch}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  albumId={albumId}
                  setAlbumId={setAlbumId}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  onlyFavorites={onlyFavorites}
                  setOnlyFavorites={setOnlyFavorites}
                  selectedIds={selectedIds}
                  handleSelectPhoto={handleSelectPhoto}
                  handleSelectAll={handleSelectAll}
                  handleClearSelection={handleClearSelection}
                  handleFavoriteSingle={handleFavoriteSingle}
                  handleDeleteSingle={handleDeleteSingle}
                  handleRenameSingle={handleRenameSingle}
                  handleMoveSingle={handleMoveSingle}
                  viewerState={viewerState}
                  setViewerState={setViewerState}
                  isLoadingPhotos={isLoadingPhotos}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                  fetchNextPage={fetchNextPage}
                  handleBulkFavorite={handleBulkFavorite}
                  handleBulkDelete={handleBulkDelete}
                  handleBulkMove={handleBulkMove}
                  roomId={roomId}
                  setActiveTab={setActiveTab}
                />
              </motion.div>
            )}

            {activeTab === "albums" && room && (
              <motion.div
                key="albums-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <AlbumsTab
                  room={room}
                  newAlbumName={newAlbumName}
                  setNewAlbumName={setNewAlbumName}
                  handleCreateAlbum={handleCreateAlbum}
                  handleDeleteAlbum={handleDeleteAlbum}
                  createAlbumPending={createAlbum.isPending}
                  deleteAlbumPending={deleteAlbum.isPending}
                />
              </motion.div>
            )}

            {activeTab === "guests" && room && (
              <motion.div
                key="guests-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <GuestsTab
                  room={room}
                  roomStats={roomStats}
                  isLoadingRequests={isLoadingRequests}
                  requests={requests}
                />
              </motion.div>
            )}

            {activeTab === "qr" && room && (
              <motion.div
                key="qr-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <QRTab room={room} roomId={roomId} />
              </motion.div>
            )}

            {activeTab === "downloads" && (
              <motion.div
                key="downloads-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <DownloadsTab
                  requests={requests}
                  isLoadingRequests={isLoadingRequests}
                  handleApproveRequest={handleApproveRequest}
                  setRejectDialog={setRejectDialog}
                />
              </motion.div>
            )}

            {activeTab === "settings" && room && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <SettingsTab
                  room={room}
                  register={register}
                  handleSubmit={handleSubmit}
                  control={control}
                  formErrors={formErrors}
                  watchAutoCloseRoom={watchAutoCloseRoom}
                  isSavingSettings={isSavingSettings}
                  handleSettingsSubmit={handleSettingsSubmit}
                  setIsDeleteOpen={setIsDeleteOpen}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteRoomDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        roomName={room?.name || ""}
      />

      {/* Rejection Input Dialog */}
      <Modal
        isOpen={rejectDialog.isOpen}
        onClose={() => setRejectDialog({ isOpen: false, reqId: "", reason: "" })}
        title="Reject Download Request"
        description="Provide a reason for rejecting this guest's download request."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Rejection</label>
            <Input
              type="text"
              placeholder="Selfie verification did not match gallery photos."
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setRejectDialog({ isOpen: false, reqId: "", reason: "" })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectRequestSubmit}
              disabled={!rejectDialog.reason}
            >
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Room Success Modal */}
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
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="font-semibold leading-normal">
                This password has been hashed and will NOT be shown again. Please save it immediately to access this room details screen later.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold"
              onClick={() => {
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
