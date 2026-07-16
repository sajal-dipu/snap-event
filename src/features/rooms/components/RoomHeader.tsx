"use client";

import * as React from "react";
import Link from "next/link";
import { Edit2, Copy, Trash2, Calendar, MapPin, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { RoomStatus } from "@/types";

interface RoomHeaderProps {
  roomId: string;
  roomName: string;
  eventType: string;
  eventDateStr: string;
  eventLocation?: string;
  status: RoomStatus;
  onDuplicate: () => void;
  onDelete: () => void;
  isLocked: boolean;
  onLockClick?: () => void;
  onStatusChange?: (newStatus: RoomStatus) => void;
}

export function RoomHeader({
  roomId,
  roomName,
  eventType,
  eventDateStr,
  eventLocation,
  status,
  onDuplicate,
  onDelete,
  isLocked,
  onLockClick,
  onStatusChange,
}: RoomHeaderProps) {
  const getStatusColor = (s: RoomStatus) => {
    switch (s) {
      case "upcoming":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "live":
        return "bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse";
      case "completed":
        return "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
      case "archived":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      case "paused":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "closed":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
    }
  };

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between md:gap-6">
      {/* Title & Metadata */}
      <div className="space-y-1.5 flex-grow">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-wider text-[10px] font-bold">
            {eventType}
          </Badge>
          <Badge className={getStatusColor(status)}>
            {status.toUpperCase()}
          </Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
          {roomName}
        </h1>
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {eventDateStr}
          </span>
          {eventLocation && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {eventLocation}
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {onLockClick && (
          <Button
            variant={isLocked ? "default" : "outline"}
            size="sm"
            onClick={onLockClick}
            className="gap-2"
          >
            <Shield className="h-4 w-4" />
            {isLocked ? "Unlocked" : "Lock Session"}
          </Button>
        )}

        {/* State Transition Actions */}
        {onStatusChange && (
          <div className="flex flex-wrap items-center gap-1">
            {(status === "active" || status === "live" || status === "upcoming") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange("paused")}
                className="text-amber-500 hover:text-amber-600 border-amber-500/20"
              >
                Pause
              </Button>
            )}
            {status === "paused" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange("active")}
                className="text-green-500 hover:text-green-600 border-green-500/20"
              >
                Resume
              </Button>
            )}
            {status !== "closed" && status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange("closed")}
                className="text-slate-500 border-slate-500/20"
              >
                Close
              </Button>
            )}
            {status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange("archived")}
                className="text-yellow-600 border-yellow-650/20"
              >
                Archive
              </Button>
            )}
            {status === "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange("active")}
                className="text-emerald-600 border-emerald-600/20"
              >
                Restore
              </Button>
            )}
          </div>
        )}

        <Link href={`/dashboard/rooms/${roomId}/edit`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Settings
          </Button>
        </Link>

        <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-2">
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="gap-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
export default RoomHeader;
