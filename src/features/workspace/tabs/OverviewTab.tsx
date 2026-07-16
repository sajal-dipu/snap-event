"use client";

import * as React from "react";
import {
  TrendingUp,
  Image as ImageIcon,
  FileDown,
  Users,
  Database,
  Star,
  Clock,
  Calendar,
  UploadCloud,
  Eye,
  Loader
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import RoomPhotoUploader from "@/features/gallery/components/RoomPhotoUploader";
import RoomUploadQueue from "@/features/gallery/components/RoomUploadQueue";
import type { VirtualRoom, Photo } from "@/types";

export interface OverviewTabProps {
  room: VirtualRoom;
  roomStats: {
    photoCount: number;
    storageUsed: number;
    guestCount: number;
    downloads: number;
    favorites: number;
    lastUpload: Date | null;
    aiIndexedCount: number;
  };
  isUploading: boolean;
  setIsUploading: (val: boolean) => void;
  uploadFiles: File[];
  setUploadFiles: (files: File[]) => void;
  photos: Photo[];
  recentPhotos: Photo[];
  realtimeActivity: {
    uploads: any[];
    downloads: any[];
    guests: any[];
    aiProcessed: any[];
    favorites: any[];
  };
  roomId: string;
  refetchPhotos: () => void;
  fetchRoomInfo: () => void;
}

export function OverviewTab({
  room,
  roomStats,
  isUploading,
  setIsUploading,
  uploadFiles,
  setUploadFiles,
  photos,
  recentPhotos,
  realtimeActivity,
  roomId,
  refetchPhotos,
  fetchRoomInfo
}: OverviewTabProps) {
  
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

  return (
    <div className="space-y-6">
      
      {/* Analytics widgets */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4 select-none">
        
        {/* Total Photos */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
            Total Photos
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{roomStats.photoCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Uploaded to Cloudinary</p>
        </div>

        {/* Guests Visited */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-emerald-500" />
            Guests Visited
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{roomStats.guestCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Unique guest portal views</p>
        </div>

        {/* AI Indexed Photos */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 text-purple-500" />
            AI Indexed Photos
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{roomStats.aiIndexedCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Processed face landmarks</p>
        </div>

        {/* Downloads */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <FileDown className="h-3.5 w-3.5 text-indigo-500" />
            Downloads
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{roomStats.downloads}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Watermark-free files saved</p>
        </div>

        {/* Favorites */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-pink-500" />
            Favorites
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{roomStats.favorites}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Starred photographs</p>
        </div>

        {/* Storage Used */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Database className="h-3.5 w-3.5 text-amber-500" />
            Storage Used
          </p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight mt-2">{formatStorage(roomStats.storageUsed)}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-medium">Cloudinary storage consumed</p>
        </div>

        {/* Created Date */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            Created Date
          </p>
          <p className="text-sm font-extrabold text-foreground mt-3">
            {room.createdAt ? (room.createdAt as any).toDate().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Event initialized time</p>
        </div>

        {/* Last Upload */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-violet-500" />
            Last Upload
          </p>
          <p className="text-sm font-extrabold text-foreground mt-3">
            {formatLastUpload(roomStats.lastUpload)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Latest image added</p>
        </div>
      </div>

      {/* Upload experience */}
      <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Upload Workspace Photos</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                Upload originals to Cloudinary; database mapping & AI processing will start instantly.
              </p>
            </div>
            {isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsUploading(false);
                  setUploadFiles([]);
                }}
                className="text-xs font-bold text-muted-foreground rounded-xl"
              >
                Back to Overview
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isUploading ? (
            uploadFiles.length === 0 ? (
              <RoomPhotoUploader
                onFilesSelected={(files) => setUploadFiles(files)}
                existingPhotos={photos}
              />
            ) : (
              <RoomUploadQueue
                files={uploadFiles}
                roomId={roomId}
                onClear={() => {
                  setUploadFiles([]);
                  setIsUploading(false);
                  refetchPhotos();
                  fetchRoomInfo();
                }}
                onUploadComplete={() => {
                  refetchPhotos();
                  fetchRoomInfo();
                }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/10 border border-dashed border-border rounded-2xl gap-3">
              <UploadCloud className="h-10 w-10 text-primary animate-pulse" />
              <div>
                <p className="text-xs font-bold text-foreground">No uploads active right now</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Drag files or click button to start uploading images.</p>
              </div>
              <Button
                onClick={() => setIsUploading(true)}
                className="bg-primary text-primary-foreground font-bold shadow-md shadow-primary/10 px-6 rounded-xl mt-1.5"
              >
                Upload Photos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest Uploaded Photos */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 select-none">
          <ImageIcon className="h-4.5 w-4.5 text-primary" />
          Latest Uploaded Photos
        </h3>
        {recentPhotos.length === 0 ? (
          <Card className="border border-border bg-card p-8 text-center text-xs text-muted-foreground italic rounded-2xl select-none">
            No photos uploaded in this room yet. Use the uploader above to add photos.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentPhotos.slice(0, 4).map((photo) => (
              <div
                key={photo.id}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group relative aspect-square select-none"
              >
                <img
                  src={photo.thumbnailUrl || (photo as any).secureUrl || photo.asset?.secureUrl}
                  alt={photo.originalFilename}
                  className="h-full w-full object-cover transition-transform group-hover:scale-102 duration-300"
                  loading="lazy"
                />
                {(photo as any).favorite && (
                  <div className="absolute top-2 left-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/35 p-1 rounded-full backdrop-blur-sm">
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 text-white flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold truncate pr-3">{photo.originalFilename}</span>
                  <Badge className="bg-primary/20 text-primary-foreground border-none text-[8px] font-bold uppercase py-px px-1.5 shrink-0">
                    {photo.isProcessed ? "AI READY" : "PROCESSING AI"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Timeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-3 select-none">
        
        {/* Upload timeline */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-blue-500" />
              Recent Uploads (Realtime)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {realtimeActivity.uploads.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No recent uploads.</p>
            ) : (
              realtimeActivity.uploads.slice(0, 4).map((up) => (
                <div key={up.id} className="flex items-center gap-3.5">
                  <img src={up.thumbnailUrl || up.secureUrl} alt="" className="h-10 w-10 object-cover rounded-lg border border-border shrink-0 bg-zinc-50" />
                  <div className="overflow-hidden flex-grow text-xs">
                    <p className="font-bold text-foreground truncate">{up.fileName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {up.createdAt ? new Date(up.createdAt.toMillis ? up.createdAt.toMillis() : up.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI index timeline */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-purple-500" />
              Latest AI Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {realtimeActivity.aiProcessed.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No photos processed by AI yet.</p>
            ) : (
              realtimeActivity.aiProcessed.slice(0, 4).map((ai) => (
                <div key={ai.id} className="flex items-center gap-3.5">
                  <img src={ai.thumbnailUrl || ai.secureUrl} alt="" className="h-10 w-10 object-cover rounded-lg border border-border shrink-0 bg-zinc-50" />
                  <div className="overflow-hidden flex-grow text-xs">
                    <p className="font-bold text-foreground truncate">{ai.fileName}</p>
                    <p className="text-[9px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded w-max mt-1 font-mono uppercase">
                      Scanned {ai.faceCount || 0} faces
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Favorites timeline */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Star className="h-4 w-4 text-pink-500 fill-current" />
              Recent Favorites
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {realtimeActivity.favorites.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No starred photos yet.</p>
            ) : (
              realtimeActivity.favorites.slice(0, 4).map((fav) => (
                <div key={fav.id} className="flex items-center gap-3.5">
                  <img src={fav.thumbnailUrl || fav.secureUrl} alt="" className="h-10 w-10 object-cover rounded-lg border border-border shrink-0 bg-zinc-50" />
                  <div className="overflow-hidden flex-grow text-xs">
                    <p className="font-bold text-foreground truncate">{fav.fileName}</p>
                    <span className="text-[10px] text-pink-500 font-bold bg-pink-500/5 px-2 py-0.5 rounded-full mt-1.5 border border-pink-500/10 w-max flex items-center gap-1 select-none">
                      <Star className="h-3 w-3 fill-current" /> Favorited
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Downloads timeline */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileDown className="h-4 w-4 text-indigo-500" />
              Most Saved Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {realtimeActivity.downloads.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No photos downloaded yet.</p>
            ) : (
              realtimeActivity.downloads.slice(0, 4).map((dl) => (
                <div key={dl.id} className="flex items-center gap-3.5">
                  <img src={dl.thumbnailUrl || dl.secureUrl} alt="" className="h-10 w-10 object-cover rounded-lg border border-border shrink-0 bg-zinc-50" />
                  <div className="overflow-hidden flex-grow text-xs">
                    <p className="font-bold text-foreground truncate">{dl.fileName}</p>
                    <p className="text-[10px] text-indigo-650 font-bold bg-indigo-500/10 px-2 py-0.5 rounded w-max mt-1">
                      {dl.downloadCount || 0} downloads
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Guests submission timeline */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl md:col-span-2 lg:col-span-2">
          <CardHeader className="border-b border-border/50 pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-500" />
              Recent Guest Submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {realtimeActivity.guests.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic text-center py-4">No guest logs registered yet.</p>
            ) : (
              realtimeActivity.guests.slice(0, 4).map((gst) => (
                <div key={gst.id} className="flex items-center justify-between gap-4 text-xs">
                  <div className="overflow-hidden">
                    <p className="font-bold text-foreground truncate">{gst.customerName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{gst.customerEmail}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">
                      {gst.requestedPhotoIds?.length || 0} files
                    </span>
                    <Badge
                      className={
                        gst.status === "approved"
                          ? "bg-green-500/10 text-green-500"
                          : gst.status === "rejected"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-yellow-500/10 text-yellow-500 animate-pulse"
                      }
                    >
                      {gst.status?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
export default OverviewTab;
