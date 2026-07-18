"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  Copy, 
  Share2, 
  QrCode, 
  Calendar, 
  MapPin, 
  Users, 
  ImageIcon, 
  Download, 
  BarChart3, 
  UserCheck, 
  ExternalLink 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { APP_URL } from "@/utils/helpers";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { toast } from "sonner";
import type { VirtualRoom, RoomStatus } from "@/types";

interface RoomCardProps {
  room: VirtualRoom;
  onDuplicate: (roomId: string) => Promise<void>;
  onDelete: (roomId: string, name: string) => void;
  onQRPreview: (room: VirtualRoom) => void;
}

const EVENT_BANNERS: Record<string, string> = {
  wedding: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
  birthday: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=600&auto=format&fit=crop",
  corporate: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600&auto=format&fit=crop",
  portrait: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1452780212940-6f5c0d14d84a?q=80&w=600&auto=format&fit=crop",
};

export function RoomCard({ room, onDuplicate, onDelete, onQRPreview }: RoomCardProps) {
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const bannerUrl = room.coverImage || EVENT_BANNERS[room.eventType.toLowerCase()] || EVENT_BANNERS.default;
  const eventDateStr = room.eventDate ? room.eventDate.toDate().toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) : "";

  const locationStr = room.eventLocation
    ? `${room.eventLocation.city}, ${room.eventLocation.state}`
    : "Virtual Location";

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${APP_URL}/event/${room.id}`);
      toast.success("Room URL copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      await onDuplicate(room.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDuplicating(false);
    }
  };

  const dropdownItems = [
    {
      label: "Open Room Details",
      href: `/dashboard/rooms/${room.id}`,
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "Edit Settings",
      href: `/dashboard/rooms/${room.id}/edit`,
      icon: <Edit2 className="h-4 w-4" />,
    },
    {
      label: "Preview QR Code",
      onClick: () => onQRPreview(room),
      icon: <QrCode className="h-4 w-4" />,
    },
    {
      label: "Copy Link",
      onClick: () => handleCopyLink(),
      icon: <Copy className="h-4 w-4" />,
    },
    {
      label: "View Guests",
      href: `/dashboard/rooms/${room.id}`,
      icon: <UserCheck className="h-4 w-4" />,
    },
    {
      label: "Room Analytics",
      href: `/dashboard/rooms/${room.id}`,
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: isDuplicating ? "Duplicating..." : "Duplicate Room",
      onClick: handleDuplicate,
      icon: <Share2 className="h-4 w-4" />,
    },
    {
      label: "Delete Room",
      onClick: () => onDelete(room.id, room.name),
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive" as const,
    },
  ];

  const getStatusColor = (s: RoomStatus) => {
    switch (s) {
      case "active":
      case "live":
        return "bg-green-500/15 text-green-500 border border-green-500/30 animate-pulse";
      case "upcoming":
        return "bg-blue-500/15 text-blue-500 border border-blue-500/30";
      case "completed":
        return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30";
      case "archived":
        return "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30";
      default:
        return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="h-full"
    >
      <Card className="overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full rounded-2xl">
        {/* Event Banner */}
        <div className="relative h-44 w-full overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={room.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-t-2xl"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            <Badge className="bg-primary/95 text-primary-foreground backdrop-blur-sm border-none font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md">
              {room.eventType}
            </Badge>
            <Badge className={`${getStatusColor(room.status)} font-extrabold border-none backdrop-blur-sm uppercase text-[9px] px-2 py-0.5 rounded-md`}>
              {room.status}
            </Badge>
          </div>

          {/* Dropdown Menu Overlay */}
          <div className="absolute top-3 right-3">
            <Dropdown
              trigger={
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 transition-colors border border-white/10 backdrop-blur-sm focus:outline-none">
                  <MoreVertical className="h-4.5 w-4.5" />
                </button>
              }
              items={dropdownItems}
            />
          </div>

          {/* Name and Location overlay at bottom */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <h3 className="font-extrabold text-lg leading-tight truncate drop-shadow-md">
              {room.name}
            </h3>
            <p className="text-[10px] text-zinc-300 font-mono mt-0.5">ID: {room.id.substring(0, 12)}...</p>
            <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1 mt-1 drop-shadow-md">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              {locationStr}
            </p>
          </div>
        </div>

        {/* Card Content (Counters & Details) */}
        <CardContent className="p-4.5 flex flex-col flex-grow justify-between gap-4">
          
          {/* Date and Details grid */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
            <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
            <span>{eventDateStr}</span>
            {room.eventTime && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>{room.eventTime}</span>
              </>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 border-y border-border py-3.5 my-1">
            <div className="text-center">
              <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">
                <Users className="h-3 w-3 text-zinc-400" />
                Guests
              </span>
              <span className="font-black text-sm text-foreground">
                {room.guestCount || 0}
              </span>
            </div>

            <div className="text-center border-x border-border">
              <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">
                <ImageIcon className="h-3 w-3 text-zinc-400" />
                Photos
              </span>
              <span className="font-black text-sm text-foreground">
                {room.photoCount || 0}
              </span>
            </div>

            <div className="text-center">
              <span className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">
                <Download className="h-3 w-3 text-zinc-400" />
                Saves
              </span>
              <span className="font-black text-sm text-foreground">
                {room.approvedDownloadCount || 0}
              </span>
            </div>
          </div>

          {/* Actions Button Tray */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2 w-full">
              <Link href={`/dashboard/rooms/${room.id}`} className="flex-grow">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5 border-border rounded-xl">
                  <Eye className="h-4 w-4" /> Open
                </Button>
              </Link>
              
              <Link href={`/dashboard/rooms/${room.id}/edit`}>
                <Button variant="outline" size="sm" className="text-xs font-bold px-3 border-border rounded-xl" title="Edit settings">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQRPreview(room)}
                className="flex-grow text-xs font-bold gap-1.5 border border-border rounded-xl"
              >
                <QrCode className="h-4 w-4" /> Share QR
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyLink()}
                className="text-xs font-bold px-3 border border-border rounded-xl"
                title="Copy Link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
export default RoomCard;
