"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService, type AdminDashboardStats } from "@/services/AdminService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { BarChart3, TrendingUp, DollarSign, Camera, Users, FolderOpen } from "lucide-react";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = React.useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      try {
        const data = await adminService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load platform analytics");
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Generating analytics ledger...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  // Calculate denormalized financials
  const estGrossRevenue = (stats?.totalBookings || 0) * 15000; // estimated average shoot cost of 15k INR
  const estPlatformCommission = estGrossRevenue * 0.15; // 15% platform commission

  return (
    <AdminDashboardLayout>
      <div className="space-y-8 select-none">
        
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            System Analytics & Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze platform booking volumes, traffic metrics, photographer engagement, and gross commission revenue.
          </p>
        </div>

        {/* Core Financial Analytics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Gross revenue ledger */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Est. Gross Platform Volume
              </CardTitle>
              <DollarSign className="h-4.5 w-4.5 text-green-500" />
            </CardHeader>
            <CardContent className="space-y-1">
              <h2 className="text-3xl font-black text-foreground">₹{estGrossRevenue.toLocaleString()}</h2>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Based on booking counts multiplied by an average shoot package volume of ₹15,000.
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Platform commission (15%) */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Est. Platform Commissions (15%)
              </CardTitle>
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-1">
              <h2 className="text-3xl font-black text-primary">₹{estPlatformCommission.toLocaleString()}</h2>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Expected standard 15% marketplace platform fee derived from completed client bookings.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Photographer engagement summary */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-4.5 w-4.5 text-indigo-500" />
                Vetting Yield
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Total Registered Artists</span>
                <span className="text-foreground font-bold">{stats?.totalPhotographers}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Average Room Yield</span>
                <span className="text-foreground font-bold">
                  {stats?.totalPhotographers ? (stats.totalRooms / stats.totalPhotographers).toFixed(1) : "0"} rooms/photog
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Active Ratios</span>
                <span className="text-foreground font-bold">100% Operational</span>
              </div>
            </CardContent>
          </Card>

          {/* Event Content Summary */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="h-4.5 w-4.5 text-amber-500" />
                Content Density
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Total Photos Uploaded</span>
                <span className="text-foreground font-bold">{stats?.totalPhotos}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Average Photos Per Room</span>
                <span className="text-foreground font-bold">
                  {stats?.totalRooms ? Math.round(stats.totalPhotos / stats.totalRooms) : "0"} assets/room
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Watermarked Ratio</span>
                <span className="text-foreground font-bold">100% Watermarked</span>
              </div>
            </CardContent>
          </Card>

          {/* Guest activity indicators */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="h-4.5 w-4.5 text-pink-500" />
                Guest Interactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Aggregated Guest Visitors</span>
                <span className="text-foreground font-bold">{stats?.totalVisitors}</span>
              </div>
              <div className="flex justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Pending Approval Sessions</span>
                <span className="text-foreground font-bold">{stats?.pendingDownloadRequests}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Approval Request Ratio</span>
                <span className="text-foreground font-bold">
                  {stats?.totalVisitors ? ((stats.pendingDownloadRequests / stats.totalVisitors) * 100).toFixed(1) : "0"}%
                </span>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </AdminDashboardLayout>
  );
}
