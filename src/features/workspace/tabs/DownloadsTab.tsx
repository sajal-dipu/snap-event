"use client";

import * as React from "react";
import { FileDown, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { DownloadRequest } from "@/types";

export interface DownloadsTabProps {
  requests: DownloadRequest[];
  isLoadingRequests: boolean;
  handleApproveRequest: (req: DownloadRequest) => void;
  setRejectDialog: (state: { isOpen: boolean; reqId: string; reason: string }) => void;
}

export function DownloadsTab({
  requests,
  isLoadingRequests,
  handleApproveRequest,
  setRejectDialog
}: DownloadsTabProps) {
  
  return (
    <div className="space-y-6">
      
      <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-bold text-foreground">High-Resolution Downloads</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            Review and approve watermark-free photo download requests submitted by guests and clients.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          
          {isLoadingRequests ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
              <Clock className="h-4 w-4 animate-spin text-primary" /> Loading download approval queue...
            </div>
          ) : requests.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-12">
              No download requests have been submitted for this room yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-900/40 text-muted-foreground uppercase text-[9px] font-extrabold tracking-wider border-b border-border">
                    <th className="px-6 py-3.5">Recipient Info</th>
                    <th className="px-6 py-3.5">Email / Contact</th>
                    <th className="px-6 py-3.5">Photo Count</th>
                    <th className="px-6 py-3.5">Approval Status</th>
                    <th className="px-6 py-3.5 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-foreground block">{req.customerName}</span>
                        {req.rejectionReason && (
                          <span className="text-[9px] text-red-500 font-medium block mt-0.5">
                            Reason: {req.rejectionReason}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground space-y-0.5">
                        <span className="block font-medium">{req.customerEmail || "N/A"}</span>
                        <span className="block font-mono text-[10px]">{req.customerPhone || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-foreground">
                        {req.requestedPhotoIds?.length || 0} items
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            req.status === "approved"
                              ? "bg-green-500/10 text-green-500 border border-green-500/20"
                              : req.status === "rejected"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse"
                          }
                        >
                          {req.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApproveRequest(req)}
                              className="text-[10px] font-bold text-green-600 hover:text-green-600 hover:bg-green-500/10 rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRejectDialog({ isOpen: true, reqId: req.id, reason: "" })}
                              className="text-[10px] font-bold text-red-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg h-7 px-2.5 flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold italic pr-2">
                            Logged
                          </span>
                        )}
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
export default DownloadsTab;
