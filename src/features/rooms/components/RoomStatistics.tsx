"use client";

import * as React from "react";
import { Image, Database, Users, FileDown, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

interface RoomStatisticsProps {
  photoCount: number;
  guestCount: number;
  downloads: number;
  favorites: number;
  storageUsed: number;
  lastUpload: Date | null;
}

export function RoomStatistics({
  photoCount,
  guestCount,
  downloads,
  favorites,
  storageUsed,
  lastUpload,
}: RoomStatisticsProps) {
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

  const stats = [
    {
      title: "Total Photos",
      value: photoCount.toLocaleString(),
      icon: Image,
      description: "Uploaded photos in gallery",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      title: "Storage Used",
      value: formatStorage(storageUsed),
      icon: Database,
      description: "Cloudinary storage consumed",
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      title: "Guest Count",
      value: guestCount.toLocaleString(),
      icon: Users,
      description: "Unique visitor page views",
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      title: "Downloads",
      value: downloads.toLocaleString(),
      icon: FileDown,
      description: "Total watermark-free downloads",
      color: "text-indigo-500 bg-indigo-500/10",
    },
    {
      title: "Favorites",
      value: favorites.toLocaleString(),
      icon: Star,
      description: "Starred images by uploader/guests",
      color: "text-pink-500 bg-pink-500/10",
    },
    {
      title: "Last Upload",
      value: formatLastUpload(lastUpload),
      icon: Clock,
      description: "Most recent gallery upload",
      color: "text-purple-500 bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card
            key={stat.title}
            className="overflow-hidden border border-border bg-card/65 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-extrabold text-foreground tracking-tight mt-1.5 truncate">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shrink-0 ${stat.color}`}>
                  <IconComponent className="h-6 w-6" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 font-medium">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
export default RoomStatistics;
