"use client";

import * as React from "react";
import { QrCode, Info, Link2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { QRCodeDownload } from "./QRCodeDownload";

interface QRCodeCardProps {
  roomId: string;
  qrCodeUrl: string;
  roomName: string;
}

export function QRCodeCard({ roomId, qrCodeUrl, roomName }: QRCodeCardProps) {
  const qrServerUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeUrl)}`;

  return (
    <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Event QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
          <div className="relative p-4 bg-white rounded-xl shadow-inner border border-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrServerUrl}
              alt={`QR Code for ${roomName}`}
              className="w-48 h-48 block"
              loading="lazy"
            />
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border px-3 py-1.5 rounded-full max-w-full">
            <Link2 className="h-3 w-3 text-zinc-400 shrink-0" />
            <span className="truncate max-w-[240px] font-mono">{qrCodeUrl}</span>
          </div>
        </div>

        {/* Action Controls */}
        <QRCodeDownload qrCodeUrl={qrCodeUrl} roomName={roomName} />

        {/* Information box */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 text-xs text-blue-800 dark:text-blue-400">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Important QR Information</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground text-[11px]">
              This QR code maps ONLY to the event room landing page. It does not contain any passwords, photographer identifiers, or internal DB configurations. Share this code with event hosts to place on tables, slides, or custom signs.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export default QRCodeCard;
