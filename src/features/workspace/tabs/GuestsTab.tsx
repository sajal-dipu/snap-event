"use client";

import * as React from "react";
import { Users, QrCode, Eye, FileDown, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { VirtualRoom, DownloadRequest } from "@/types";

export interface GuestsTabProps {
  room: VirtualRoom;
  roomStats: {
    guestCount: number;
    downloads: number;
  };
  isLoadingRequests: boolean;
  requests: DownloadRequest[];
  qrScans?: number;
  galleryViews?: number;
}

export function GuestsTab({
  room,
  roomStats,
  isLoadingRequests,
  requests,
  qrScans = 0,
  galleryViews = 0
}: GuestsTabProps) {
  
  // Extract unique guests based on name and contact details from requests
  const uniqueGuests = React.useMemo(() => {
    const guestsMap = new Map<string, { name: string; email: string; phone: string; status: string; date: any }>();
    
    requests.forEach((req) => {
      const key = `${req.customerEmail || ""}_${req.customerPhone || ""}`.trim();
      if (!key) return;
      
      const existing = guestsMap.get(key);
      if (!existing || req.createdAt > existing.date) {
        guestsMap.set(key, {
          name: req.customerName,
          email: req.customerEmail || "N/A",
          phone: req.customerPhone || "N/A",
          status: req.status || "pending",
          date: req.createdAt
        });
      }
    });
    
    return Array.from(guestsMap.values()).sort((a, b) => b.date - a.date);
  }, [requests]);

  return (
    <div className="space-y-6">
      
      {/* Visual counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        
        {/* Total Unique Registered Attendees */}
        <Card className="border border-border bg-card p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registered Guests</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{uniqueGuests.length}</p>
          </div>
        </Card>

        {/* QR Code Scans */}
        <Card className="border border-border bg-card p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">QR Code Scans</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{roomStats.guestCount || 0}</p>
          </div>
        </Card>

        {/* Total Watermarked Downloads */}
        <Card className="border border-border bg-card p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
            <FileDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Approved Download requests</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{roomStats.downloads}</p>
          </div>
        </Card>

      </div>

      {/* Guest registration table */}
      <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-bold text-foreground">Registered Guests & Attendees</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Timeline list of visitors who requested image access, matched face groups, or submitted high-resolution download requests.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
              <Clock className="h-4 w-4 animate-spin text-primary" /> Loading guest registry logs...
            </div>
          ) : uniqueGuests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-12">
              No registered guests found. Share the QR Poster code or links to start receiving traffic!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/40 text-muted-foreground uppercase text-[9px] font-extrabold tracking-wider border-b border-border">
                    <th className="px-6 py-3.5">Guest Info</th>
                    <th className="px-6 py-3.5">Email Address</th>
                    <th className="px-6 py-3.5">Contact Number</th>
                    <th className="px-6 py-3.5">Approval Status</th>
                    <th className="px-6 py-3.5 text-right">Register Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {uniqueGuests.map((gst, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-zinc-400" />
                          </span>
                          <span className="font-bold text-foreground">{gst.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">{gst.email}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{gst.phone}</td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            gst.status === "approved"
                              ? "bg-green-500/10 text-green-500 border border-green-500/20"
                              : gst.status === "rejected"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse"
                          }
                        >
                          {gst.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                        {gst.date ? (gst.date.toDate ? gst.date.toDate() : new Date(gst.date)).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  );
}
export default GuestsTab;
