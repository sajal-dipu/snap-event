"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Image as ImageIcon,
  FileDown,
  Users,
  Database,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Calendar,
  Activity,
  Zap,
  ArrowRight,
  Clock,
  LayoutDashboard
} from "lucide-react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { roomService } from "@/services/RoomService";
import { downloadRequestService } from "@/services/DownloadRequestService";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import type { VirtualRoom, DownloadRequest } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [rooms, setRooms] = React.useState<VirtualRoom[]>([]);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [requests, setRequests] = React.useState<DownloadRequest[]>([]);
  const [todayStats, setTodayStats] = React.useState({
    uploads: 0,
    downloads: 0,
    guests: 0,
  });

  const loadDashboardData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Rooms
      const fetchedRooms = await roomService.listByPhotographer(user.uid);
      setRooms(fetchedRooms);

      // 2. Fetch Requests
      const fetchedRequestsRes = await downloadRequestService.listByPhotographer(user.uid, {}, 100);
      const fetchedRequests = fetchedRequestsRes.data || [];
      setRequests(fetchedRequests);

      // 3. Compute Today's Stats
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Count today's approved downloads & requests
      let todayDownloadsCount = 0;
      let todayGuestsCount = 0;

      fetchedRequests.forEach((req: any) => {
        const reqDate = req.createdAt?.toDate ? req.createdAt.toDate() : new Date(req.createdAt || 0);
        if (reqDate >= startOfToday) {
          todayGuestsCount += 1;
          if (req.status === "approved") {
            todayDownloadsCount += req.requestedPhotoIds?.length || 0;
          }
        }
      });

      // Count today's uploads across all rooms
      let todayUploadsCount = 0;
      try {
        const qTodayPhotos = query(
          collection(db, "photos"),
          where("photographerId", "==", user.uid),
          where("isDeleted", "==", false)
        );
        const photoSnaps = await getDocs(qTodayPhotos);
        photoSnaps.forEach((doc) => {
          const data = doc.data();
          const uploadDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0);
          if (uploadDate >= startOfToday) {
            todayUploadsCount += 1;
          }
        });
      } catch (err) {
        console.warn("Failed to fetch today's uploads count, using fallback:", err);
      }

      // Fetch all unique photos to compute totalPhotosCount
      try {
        const qPhotos = query(
          collection(db, "photos"),
          where("photographerId", "==", user.uid),
          where("isDeleted", "==", false)
        );
        const photoSnaps = await getDocs(qPhotos);
        const fetchedPhotos = photoSnaps.docs.map(doc => doc.data());
        setPhotos(fetchedPhotos);
      } catch (err) {
        console.warn("Failed to fetch all photographer photos:", err);
      }

      setTodayStats({
        uploads: todayUploadsCount,
        downloads: todayDownloadsCount,
        guests: todayGuestsCount,
      });

    } catch (error) {
      console.error("Failed to load photographer analytics dashboard:", error);
      toast.error("Error updating analytics data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Analytics derivations
  const totalRoomsCount = rooms.length;
  
  const totalPhotosCount = photos.length; // Do NOT add AI indexed photos into total count.
  
  const totalStorageBytes = rooms.reduce((sum, r) => {
    // Fallback compilation from room stats
    return sum + ((r as any).storageUsed || 0);
  }, 0);

  const formatStorage = (bytes: number) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const lastRoom = React.useMemo(() => {
    if (rooms.length === 0) return null;
    return [...rooms].sort((a: any, b: any) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : new Date(a.updatedAt || 0).getTime();
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [rooms]);

  const handleOpenLastRoom = () => {
    if (lastRoom) {
      router.push(`/dashboard/rooms/${lastRoom.id}`);
    } else {
      toast.info("No active rooms found. Please create a virtual room first.");
    }
  };

  const handleViewBookings = () => {
    router.push("/dashboard/bookings");
  };

  // Activity feed compilation
  const activityTimeline = React.useMemo(() => {
    const activities: any[] = [];
    rooms.forEach((r) => {
      if (r.createdAt) {
        activities.push({
          type: "room_created",
          title: `Created Virtual Room: ${r.name}`,
          description: `Initialized category settings & live portal`,
          date: (r.createdAt as any).toDate ? (r.createdAt as any).toDate() : new Date(r.createdAt as any),
          roomName: r.name,
          roomId: r.id,
        });
      }
    });

    requests.forEach((req) => {
      if (req.createdAt) {
        activities.push({
          type: "download_request",
          title: `Download requested by ${req.customerName}`,
          description: `Requested watermark-free download for ${req.requestedPhotoIds?.length || 0} items`,
          date: (req.createdAt as any).toDate ? (req.createdAt as any).toDate() : new Date(req.createdAt as any),
          roomName: (req as any).roomName || "Virtual Room",
          roomId: req.roomId,
        });
      }
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [rooms, requests]);

  if (loading) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Compiling studio statistics...</p>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 pb-12 select-none">
        
        {/* Top welcome segment */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div className="space-y-1">
            <span className="bg-primary/10 text-primary text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 w-max">
              <Sparkles className="h-3 w-3 animate-pulse" /> Photographer Analytics Hub
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Creator Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Real-time monitoring of your virtual rooms, photo uploads, and guest downloads.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleOpenLastRoom}
              variant="outline"
              size="sm"
              disabled={!lastRoom}
              className="gap-2 border-zinc-200 dark:border-zinc-800 rounded-xl"
            >
              Open Last Room
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Link href="/dashboard/rooms?create=true">
              <Button
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 rounded-xl"
              >
                <Plus className="h-4 w-4" />
                Create Room
              </Button>
            </Link>
          </div>
        </div>

        {/* METRICS COUNTER CARDS */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Rooms */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Rooms</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">{totalRoomsCount}</h3>
              </div>
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary shrink-0 group-hover:scale-105 transition-transform">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-green-500" />
                Workspace Rooms
              </span>
            </div>
          </div>

          {/* Card 2: Total Photos */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Photos</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">{totalPhotosCount}</h3>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 shrink-0 group-hover:scale-105 transition-transform">
                <ImageIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
              <span className="font-semibold text-foreground">Cloud originals saved</span>
            </div>
          </div>

          {/* Card 3: Storage Consumed */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Storage Used</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">{formatStorage(totalStorageBytes)}</h3>
              </div>
              <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500 shrink-0 group-hover:scale-105 transition-transform">
                <Database className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
              <span className="font-semibold text-foreground">Cloudinary assets</span>
            </div>
          </div>

          {/* Card 4: Guest download requests approved */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Downloads</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">
                  {requests.filter((r) => r.status === "approved").reduce((sum, r) => sum + (r.requestedPhotoIds?.length || 0), 0)}
                </h3>
              </div>
              <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-500 shrink-0 group-hover:scale-105 transition-transform">
                <FileDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
              <span className="font-semibold text-foreground">Approved high-res files</span>
            </div>
          </div>
        </div>

        {/* TODAY'S METRICS SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl flex flex-col justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Uploads</p>
                <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">{todayStats.uploads} photos</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/40 font-medium">
              Landmark recognition automatically indexes uploads.
            </p>
          </Card>

          <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl flex flex-col justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Downloads</p>
                <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">{todayStats.downloads} files</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/40 font-medium">
              Approved watermark-free files processed.
            </p>
          </Card>

          <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl flex flex-col justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Today&apos;s Guest Visitors</p>
                <p className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">{todayStats.guests} guests</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border/40 font-medium">
              Attending guests who visited galleries today.
            </p>
          </Card>

        </div>

        {/* QUICK SHORTCUTS & ACTIVITY LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-3">
          
          {/* Quick Actions Shortcuts */}
          <Card className="border border-border bg-card/60 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between h-[360px]">
            <CardHeader className="border-b border-border/40 pb-3.5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex-grow flex flex-col justify-between">
              <div className="space-y-3">
                <Link href="/dashboard/rooms?create=true" className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900/15 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Create Event Room</p>
                      <p className="text-[9px] text-muted-foreground">Setup custom settings, cover & password</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <button
                  onClick={handleOpenLastRoom}
                  disabled={!lastRoom}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900/15 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Open Last Active Room</p>
                      <p className="text-[9px] text-muted-foreground truncate max-w-[180px]">
                        {lastRoom ? `Resume work in "${lastRoom.name}"` : "No active event room"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={handleViewBookings}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900/15 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">View Studio Bookings</p>
                      <p className="text-[9px] text-muted-foreground">Manage client sessions & events schedule</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="pt-4 border-t border-border/30 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Last updated dashboard stats just now</span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log timeline */}
          <Card className="border border-border bg-card/60 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden lg:col-span-2 h-[360px]">
            <CardHeader className="border-b border-border/40 pb-3.5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                Studio Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 overflow-y-auto h-[290px] space-y-4 no-scrollbar">
              {activityTimeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground italic gap-2">
                  <LayoutDashboard className="h-8 w-8 text-zinc-400" />
                  No events logged in the last 48 hours.
                </div>
              ) : (
                activityTimeline.map((act, index) => (
                  <div key={index} className="flex gap-4 items-start text-xs relative">
                    {index < activityTimeline.length - 1 && (
                      <span className="absolute left-[15px] top-[26px] bottom-[-22px] w-[1.5px] bg-border/50" />
                    )}
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-border ${
                      act.type === "room_created"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-indigo-500/10 text-indigo-500"
                    }`}>
                      {act.type === "room_created" ? <FolderKanban className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
                    </span>
                    <div className="overflow-hidden flex-grow space-y-0.5 pt-0.5">
                      <p className="font-bold text-foreground leading-snug">{act.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-normal">{act.description}</p>
                      <div className="flex items-center gap-3 pt-1 text-[9px] text-muted-foreground">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-semibold text-[8px] uppercase tracking-wide">
                          {act.roomName}
                        </span>
                        <span>
                          {act.date.toLocaleDateString([], { month: "short", day: "numeric" })} at {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </PhotographerDashboardLayout>
  );
}
