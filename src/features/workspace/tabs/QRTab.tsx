"use client";

import * as React from "react";
import { QRCodeCard } from "@/features/rooms/components/QRCodeCard";
import type { VirtualRoom } from "@/types";
import { APP_URL } from "@/utils/helpers";

export interface QRTabProps {
  room: VirtualRoom;
  roomId: string;
}

export function QRTab({ room, roomId }: QRTabProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Poster components block */}
      <QRCodeCard
        roomId={roomId}
        roomName={room.name}
        qrCodeUrl={`${APP_URL}/event/${roomId}`}
      />

    </div>
  );
}
export default QRTab;
