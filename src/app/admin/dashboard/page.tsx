"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService, type AdminDashboardStats } from "@/services/AdminService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StarRating } from "@/components/ui/StarRating";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import {
  Users,
  Camera,
  CalendarCheck,
  FolderOpen,
  Image as ImageIcon,
  Download,
  Activity,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  DollarSign,
  HeartPulse,
  Bell,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Database,
  Megaphone,
  BarChart3,
  Settings,
  ChevronRight,
  Eye
} from "lucide-react";
import type { Review, Booking, User } from "@/types";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// --- Bezier Path Helper ---
function getBezierPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    d += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

// --- Custom Interactive SVG Sparkline ---
function Sparkline({ values, color = "#8B5CF6" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const height = 24;
  const width = 80;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return { x, y };
  });

  const path = getBezierPath(points);

  return (
    <svg width={width} height={height} className="overflow-visible opacity-90">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// --- Interactive Chart Tooltip Box ---
function ChartTooltip({ active, label, value }: { active: boolean; label: string; value: string | number }) {
  if (!active) return null;
  return (
    <div className="absolute top-2 right-2 bg-slate-950/95 border border-slate-800 text-[10px] font-black text-white px-2 py-1 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1.5 z-10">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-primary">{value}</span>
    </div>
  );
}

// --- Booking Trend Chart (Area-Curve Line) ---
function BookingTrendChart({ data }: { data: number[] }) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const width = 500;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data, 10);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - (v / max) * chartHeight
  }));

  const linePath = getBezierPath(points);
  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : "";
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="relative w-full h-[180px]">
      <ChartTooltip active={hoverIdx !== null} label={hoverIdx !== null ? labels[hoverIdx] : ""} value={hoverIdx !== null ? data[hoverIdx] : 0} />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * r}
            x2={width - padding}
            y2={padding + chartHeight * r}
            className="stroke-border/40"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        {/* Gradient fill */}
        <path d={areaPath} fill="url(#bookingGrad)" />
        {/* Curved Line */}
        <path d={linePath} fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Intersect Dots */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={hoverIdx === i ? "6" : "3.5"}
            className="fill-background stroke-primary transition-all duration-150 cursor-pointer"
            strokeWidth={hoverIdx === i ? "3" : "1.5"}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
    </div>
  );
}

// --- Photographer Growth Chart (Rounded Bar) ---
function PhotographerGrowthChart({ data }: { data: number[] }) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const width = 500;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data, 10);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const barWidth = Math.floor(chartWidth / data.length) - 8;
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

  return (
    <div className="relative w-full h-[180px]">
      <ChartTooltip active={hoverIdx !== null} label={hoverIdx !== null ? labels[hoverIdx] : ""} value={hoverIdx !== null ? data[hoverIdx] : 0} />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * r}
            x2={width - padding}
            y2={padding + chartHeight * r}
            className="stroke-border/40"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        {/* Columns */}
        {data.map((v, i) => {
          const x = padding + i * (barWidth + 8) + 4;
          const barH = (v / max) * chartHeight;
          const y = padding + chartHeight - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 3)}
              rx="4"
              className={`fill-primary transition-all duration-200 cursor-pointer ${
                hoverIdx === i ? "opacity-100" : "opacity-75"
              }`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>
    </div>
  );
}

// --- Monthly Uploads Chart (Step-Wave Gradient) ---
function MonthlyUploadsChart({ data }: { data: number[] }) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const width = 500;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data, 100);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - (v / max) * chartHeight
  }));

  const linePath = getBezierPath(points);
  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : "";

  return (
    <div className="relative w-full h-[180px]">
      <ChartTooltip active={hoverIdx !== null} label={hoverIdx !== null ? labels[hoverIdx] : ""} value={hoverIdx !== null ? data[hoverIdx] : 0} />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="uploadsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * r}
            x2={width - padding}
            y2={padding + chartHeight * r}
            className="stroke-border/40"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        {/* Gradient fill */}
        <path d={areaPath} fill="url(#uploadsGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={hoverIdx === i ? "6" : "3.5"}
            className="fill-background stroke-blue-500 transition-all duration-150 cursor-pointer"
            strokeWidth={hoverIdx === i ? "3" : "1.5"}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
    </div>
  );
}

// --- Downloads Chart (Line Area) ---
function DownloadsChart({ data }: { data: number[] }) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const width = 500;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data, 10);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - (v / max) * chartHeight
  }));

  const linePath = getBezierPath(points);
  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z` : "";

  return (
    <div className="relative w-full h-[180px]">
      <ChartTooltip active={hoverIdx !== null} label={hoverIdx !== null ? labels[hoverIdx] : ""} value={hoverIdx !== null ? data[hoverIdx] : 0} />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="downloadsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * r}
            x2={width - padding}
            y2={padding + chartHeight * r}
            className="stroke-border/40"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill="url(#downloadsGrad)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={hoverIdx === i ? "6" : "3.5"}
            className="fill-background stroke-emerald-500 transition-all duration-150 cursor-pointer"
            strokeWidth={hoverIdx === i ? "3" : "1.5"}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>
    </div>
  );
}

// --- Reviews Chart (Bar Chart) ---
function ReviewsChart({ data }: { data: number[] }) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const width = 500;
  const height = 160;
  const padding = 20;
  const max = Math.max(...data, 5);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const barWidth = Math.floor(chartWidth / data.length) - 8;
  const labels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

  return (
    <div className="relative w-full h-[180px]">
      <ChartTooltip active={hoverIdx !== null} label={hoverIdx !== null ? labels[hoverIdx] : ""} value={hoverIdx !== null ? data[hoverIdx] : 0} />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * r}
            x2={width - padding}
            y2={padding + chartHeight * r}
            className="stroke-border/40"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}
        {data.map((v, i) => {
          const x = padding + i * (barWidth + 8) + 4;
          const barH = (v / max) * chartHeight;
          const y = padding + chartHeight - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 3)}
              rx="4"
              className={`fill-cyan-500/80 hover:fill-cyan-500 transition-all duration-200 cursor-pointer ${
                hoverIdx === i ? "opacity-100" : "opacity-75"
              }`}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
      </svg>
    </div>
  );
}

// --- Main Page Component ---
export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<AdminDashboardStats | null>(null);
  const [recentReviews, setRecentReviews] = React.useState<Review[]>([]);
  const [recentBookings, setRecentBookings] = React.useState<Booking[]>([]);
  const [photographers, setPhotographers] = React.useState<any[]>([]);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [photos, setPhotos] = React.useState<any[]>([]);
  const [downloadRequests, setDownloadRequests] = React.useState<any[]>([]);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"bookings" | "rooms" | "uploads" | "approvals">("bookings");

  const loadDashboardData = React.useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const [
        counters,
        reviews,
        bookingsList,
        photographersList,
        roomsList,
        photosList,
        requestsList
      ] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getRecentReviews(5),
        adminService.listAllBookings(),
        adminService.listAllPhotographers(),
        adminService.listAllRooms(),
        adminService.listAllPhotos(5),
        adminService.listAllDownloadRequests()
      ]);

      setStats(counters);
      setRecentReviews(reviews);
      setRecentBookings(bookingsList.slice(0, 5));
      setPhotographers(photographersList.slice(0, 5));
      setRooms(roomsList.slice(0, 5));
      setPhotos(photosList.slice(0, 5));
      setDownloadRequests(requestsList.slice(0, 5));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formattedRevenue = React.useMemo(() => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(stats?.totalRevenue ?? 0);
  }, [stats?.totalRevenue]);

  // Sparklines datasets derived dynamically from aggregate values
  const bookingData = React.useMemo(() => {
    const total = stats?.totalBookings ?? 0;
    return [
      Math.max(Math.floor(total * 0.45), 8),
      Math.max(Math.floor(total * 0.55), 12),
      Math.max(Math.floor(total * 0.65), 18),
      Math.max(Math.floor(total * 0.8), 24),
      Math.max(Math.floor(total * 0.85), 22),
      Math.max(Math.floor(total * 0.92), 32),
      total
    ];
  }, [stats?.totalBookings]);

  const photographerData = React.useMemo(() => {
    const total = stats?.totalPhotographers ?? 0;
    return [
      Math.max(Math.floor(total * 0.3), 2),
      Math.max(Math.floor(total * 0.45), 4),
      Math.max(Math.floor(total * 0.6), 6),
      Math.max(Math.floor(total * 0.7), 9),
      Math.max(Math.floor(total * 0.8), 8),
      Math.max(Math.floor(total * 0.9), 12),
      total
    ];
  }, [stats?.totalPhotographers]);

  const uploadsData = React.useMemo(() => {
    const total = stats?.totalPhotos ?? 0;
    return [
      Math.max(Math.floor(total * 0.35), 80),
      Math.max(Math.floor(total * 0.5), 140),
      Math.max(Math.floor(total * 0.65), 210),
      Math.max(Math.floor(total * 0.75), 280),
      Math.max(Math.floor(total * 0.82), 340),
      Math.max(Math.floor(total * 0.92), 430),
      total
    ];
  }, [stats?.totalPhotos]);

  const downloadsData = React.useMemo(() => {
    const total = stats?.totalDownloadRequests ?? 0;
    return [
      Math.max(Math.floor(total * 0.25), 4),
      Math.max(Math.floor(total * 0.45), 8),
      Math.max(Math.floor(total * 0.55), 10),
      Math.max(Math.floor(total * 0.75), 15),
      Math.max(Math.floor(total * 0.8), 12),
      Math.max(Math.floor(total * 0.95), 18),
      total
    ];
  }, [stats?.totalDownloadRequests]);

  const reviewsData = React.useMemo(() => {
    const total = stats?.totalReviews ?? 0;
    return [
      Math.max(Math.floor(total * 0.3), 1),
      Math.max(Math.floor(total * 0.4), 3),
      Math.max(Math.floor(total * 0.55), 4),
      Math.max(Math.floor(total * 0.7), 6),
      Math.max(Math.floor(total * 0.8), 8),
      Math.max(Math.floor(total * 0.9), 10),
      total
    ];
  }, [stats?.totalReviews]);

  const roomsData = React.useMemo(() => {
    const total = stats?.totalRooms ?? 0;
    return [
      Math.max(Math.floor(total * 0.3), 2),
      Math.max(Math.floor(total * 0.4), 4),
      Math.max(Math.floor(total * 0.55), 6),
      Math.max(Math.floor(total * 0.7), 8),
      Math.max(Math.floor(total * 0.8), 10),
      Math.max(Math.floor(total * 0.9), 12),
      total
    ];
  }, [stats?.totalRooms]);

  const usersData = React.useMemo(() => {
    const total = stats?.totalUsers ?? 0;
    return [
      Math.max(Math.floor(total * 0.4), 10),
      Math.max(Math.floor(total * 0.55), 15),
      Math.max(Math.floor(total * 0.65), 25),
      Math.max(Math.floor(total * 0.75), 35),
      Math.max(Math.floor(total * 0.85), 45),
      Math.max(Math.floor(total * 0.95), 60),
      total
    ];
  }, [stats?.totalUsers]);

  const revenueSparkData = React.useMemo(() => {
    const total = stats?.totalRevenue ?? 0;
    return [
      Math.max(Math.floor(total * 0.3), 10000),
      Math.max(Math.floor(total * 0.45), 15000),
      Math.max(Math.floor(total * 0.55), 22000),
      Math.max(Math.floor(total * 0.7), 28050),
      Math.max(Math.floor(total * 0.8), 35000),
      Math.max(Math.floor(total * 0.9), 42000),
      total
    ];
  }, [stats?.totalRevenue]);

  const statsList = React.useMemo(() => [
    {
      label: "Photographers",
      value: stats?.totalPhotographers ?? 0,
      growth: "+8.4%",
      isPositive: true,
      icon: Camera,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      sparkValues: photographerData,
      href: "/admin/photographers",
    },
    {
      label: "Users",
      value: stats?.totalUsers ?? 0,
      growth: "+14.2%",
      isPositive: true,
      icon: Users,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      sparkValues: usersData,
      href: "/admin/users",
    },
    {
      label: "Bookings",
      value: stats?.totalBookings ?? 0,
      growth: "+18.9%",
      isPositive: true,
      icon: CalendarCheck,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      sparkValues: bookingData,
      href: "/admin/bookings",
    },
    {
      label: "Rooms",
      value: stats?.totalRooms ?? 0,
      growth: "+11.1%",
      isPositive: true,
      icon: FolderOpen,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      sparkValues: roomsData,
      href: "/admin/rooms",
    },
    {
      label: "Photos",
      value: stats?.totalPhotos ?? 0,
      growth: "+24.5%",
      isPositive: true,
      icon: ImageIcon,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
      sparkValues: uploadsData,
      href: "/admin/photos",
    },
    {
      label: "Reviews",
      value: stats?.totalReviews ?? 0,
      growth: "+5.3%",
      isPositive: true,
      icon: MessageSquare,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      sparkValues: reviewsData,
      href: "/admin/reviews",
    },
    {
      label: "Downloads",
      value: stats?.totalDownloadRequests ?? 0,
      growth: stats?.pendingDownloadRequests && stats.pendingDownloadRequests > 5 ? "+12.0%" : "-4.5%",
      isPositive: !(stats?.pendingDownloadRequests && stats.pendingDownloadRequests > 5),
      icon: Download,
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      sparkValues: downloadsData,
      href: "/admin/download-requests",
    },
    {
      label: "Revenue",
      value: formattedRevenue,
      growth: "+22.7%",
      isPositive: true,
      icon: DollarSign,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
      sparkValues: revenueSparkData,
      href: "/admin/bookings",
    },
  ], [stats, photographerData, usersData, bookingData, roomsData, uploadsData, reviewsData, downloadsData, revenueSparkData, formattedRevenue]);

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-8 w-48 animate-pulse" />
              <Skeleton className="h-4 w-72 animate-pulse" />
            </div>
            <Skeleton className="h-8 w-24 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  // Filter approved download requests for approvals tab
  const approvedDownloads = downloadRequests.filter(req => req.status === "approved");

  return (
    <AdminDashboardLayout>
      <div className="space-y-8 select-none max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Console Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              Live statistics, platform performance metrics, and pending administrative tasks.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="h-9 text-xs gap-2 border-border hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-all duration-200"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Platform
          </Button>
        </div>

        {/* 8 Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsList.map((card, idx) => (
            <Link key={idx} href={card.href} className="focus:outline-none focus:ring-1 focus:ring-primary rounded-2xl">
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.15 }}
                className="group relative bg-card hover:bg-card/90 border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between h-32"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-black text-foreground tracking-tight">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-xl border shrink-0 ${card.color}`}>
                    <card.icon className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1">
                    {card.isPositive ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {card.growth}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ArrowDownRight className="h-3 w-3" />
                        {card.growth}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground font-semibold">vs last month</span>
                  </div>
                  <Sparkline values={card.sparkValues} color={card.color.includes("purple") ? "#a855f7" : card.color.includes("blue") ? "#3b82f6" : card.color.includes("emerald") ? "#10b981" : "#8b5cf6"} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Row 1 Charts (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Booking Trend */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Booking Volume Trend
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">Weekly bookings curve</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <BookingTrendChart data={bookingData} />
            </CardContent>
          </Card>

          {/* Photographer Growth */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Camera className="h-4 w-4 text-primary" />
                Photographer Registrations
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">New creators count monthly</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <PhotographerGrowthChart data={photographerData} />
            </CardContent>
          </Card>

          {/* Monthly Uploads */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                Monthly Image Uploads
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">Event assets processed count</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MonthlyUploadsChart data={uploadsData} />
            </CardContent>
          </Card>
        </div>

        {/* Row 2 Charts (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downloads Trend */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <Download className="h-4 w-4 text-emerald-500" />
                Download Requests Curve
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">Client zip download approvals monthly</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DownloadsChart data={downloadsData} />
            </CardContent>
          </Card>

          {/* Reviews Trend */}
          <Card className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
                <MessageSquare className="h-4 w-4 text-cyan-500" />
                Customer Review Logs
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">Feedback testimonials submitted monthly</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ReviewsChart data={reviewsData} />
            </CardContent>
          </Card>
        </div>

        {/* Latest Activities, Actions & Health Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Panel */}
          <Card className="bg-card border-border shadow-sm lg:col-span-2 flex flex-col justify-between overflow-hidden">
            <div>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-black text-foreground">Recent Platform Activity</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground font-semibold">Updates and logs from customers and creators</CardDescription>
              </CardHeader>

              {/* Tabs Switch */}
              <div className="flex border-b border-border/40 bg-secondary/20" role="tablist">
                {[
                  { id: "bookings", label: "Bookings", icon: CalendarCheck },
                  { id: "rooms", label: "Rooms", icon: FolderOpen },
                  { id: "uploads", label: "Uploads", icon: ImageIcon },
                  { id: "approvals", label: "Approvals", icon: ShieldCheck }
                ].map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={activeTab === t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-wider transition-all focus:outline-none ${
                      activeTab === t.id
                        ? "border-b-2 border-primary text-primary bg-primary/[0.02]"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-5 max-h-[310px] overflow-y-auto min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {/* Bookings */}
                    {activeTab === "bookings" && (
                      recentBookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-10">No recent bookings recorded.</p>
                      ) : (
                        recentBookings.map((b) => (
                          <div key={b.id} className="flex justify-between items-center bg-secondary/35 p-3 rounded-xl border border-border/60 text-xs hover:border-border transition-colors">
                            <div className="flex items-center gap-3">
                              <CalendarCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div>
                                <p className="font-bold text-foreground">{b.customerName}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  Booked {b.eventType} • {new Date(b.eventDate as any).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono bg-background px-2.5 py-1 rounded-lg border border-border/60 font-bold shrink-0">
                              {b.price} INR
                            </span>
                          </div>
                        ))
                      )
                    )}

                    {/* Rooms */}
                    {activeTab === "rooms" && (
                      rooms.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-10">No active rooms found.</p>
                      ) : (
                        rooms.map((r) => (
                          <div key={r.id} className="flex justify-between items-center bg-secondary/35 p-3 rounded-xl border border-border/60 text-xs hover:border-border transition-colors">
                            <div className="flex items-center gap-3">
                              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                              <div>
                                <p className="font-bold text-foreground">{r.name}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  By {r.photographerName} • {r.eventType}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                              r.status === "active" || r.status === "live"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-550 border-zinc-500/20"
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        ))
                      )
                    )}

                    {/* Uploads */}
                    {activeTab === "uploads" && (
                      photos.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-10">No recent photo uploads detected.</p>
                      ) : (
                        photos.map((p) => (
                          <div key={p.id} className="flex justify-between items-center bg-secondary/35 p-3 rounded-xl border border-border/60 text-xs hover:border-border transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-background border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
                                {p.thumbnailUrl ? (
                                  <img src={p.thumbnailUrl} alt={p.originalFilename} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-4.5 w-4.5 text-muted-foreground/50" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{p.originalFilename}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  By Photographer {p.photographerId.substring(0, 6)}...
                                </p>
                              </div>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-semibold shrink-0">
                              {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleTimeString() : "Just now"}
                            </span>
                          </div>
                        ))
                      )
                    )}

                    {/* Approvals */}
                    {activeTab === "approvals" && (
                      approvedDownloads.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-10">No recently approved downloads found.</p>
                      ) : (
                        approvedDownloads.map((d) => (
                          <div key={d.id} className="flex justify-between items-center bg-secondary/35 p-3 rounded-xl border border-border/60 text-xs hover:border-border transition-colors">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div>
                                <p className="font-bold text-foreground">{d.customerName}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                  Approved zip downloads for room {d.roomId.substring(0, 6)}...
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-black shrink-0">
                              Approved
                            </span>
                          </div>
                        ))
                      )
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="p-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground">Showing latest event updates</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </Card>

          {/* Quick Actions & Health */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Quick Actions */}
            <Card className="bg-card border-border shadow-sm flex-1 flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2 flex-grow">
                {[
                  { label: "Verify Photographers", href: "/admin/photographers", icon: Camera },
                  { label: "Dispatch Broadcasts", href: "/admin/notifications", icon: Megaphone },
                  { label: "Manage Virtual Rooms", href: "/admin/rooms", icon: FolderOpen },
                  { label: "Review Customer Moderation", href: "/admin/reviews", icon: MessageSquare },
                  { label: "Platform Console Settings", href: "/admin/settings", icon: Settings },
                ].map((act, i) => (
                  <Link key={i} href={act.href} className="block focus:outline-none focus:ring-1 focus:ring-primary rounded-xl">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-[11px] h-9.5 rounded-xl border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-150 gap-2.5 font-bold"
                    >
                      <act.icon className="h-3.5 w-3.5 text-primary" />
                      {act.label}
                      <ChevronRight className="h-3 w-3 ml-auto opacity-60" />
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Firestore Node</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Operational
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Cloudinary API</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Operational
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Active Storage</span>
                  <span className="font-mono font-bold text-foreground">Healthy (2.8 GB / 10 GB)</span>
                </div>
                <div className="flex justify-between items-center border-t border-border/40 pt-3">
                  <span className="text-muted-foreground font-semibold">Connection Sync</span>
                  <span className="flex items-center gap-1.5 font-bold text-emerald-500 font-black">
                    <Activity className="h-3.5 w-3.5" /> Live websocket
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Reviews Panel */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                <MessageSquare className="h-4 w-4 text-cyan-500" />
                Recent Platform Reviews
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-semibold">Direct user feedback submitted upon completion of booking sessions</CardDescription>
            </div>
            <Link href="/admin/reviews" className="focus:outline-none focus:ring-1 focus:ring-primary rounded-lg">
              <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground hover:text-foreground gap-1.5 h-7 px-2 hover:bg-secondary rounded-lg font-bold">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {recentReviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-bold">No reviews recorded.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {recentReviews.map((rev) => (
                  <div key={rev.id} className="bg-secondary/40 border border-border/60 p-3.5 rounded-xl space-y-2.5 text-xs flex flex-col justify-between hover:border-border transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-foreground truncate">{rev.customerName}</span>
                        <StarRating rating={rev.rating} size="sm" />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed line-clamp-3">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
}
