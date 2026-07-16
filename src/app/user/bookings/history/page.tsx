"use client";

import React, { useState, useEffect } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  CalendarDays,
  MapPin,
  AlertCircle,
  ArrowLeft,
  XCircle,
  CheckCircle2,
  Undo2
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/types";

export default function BookingHistoryPage() {
  const { user, isLoading } = useRequireAuth({ requiredRole: "user" });
  const [history, setHistory] = useState<Booking[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Subscribe to bookings and filter history
  useEffect(() => {
    if (!user?.uid) return;

    setHistoryLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("customerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Booking[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const stat = d.bookingStatus || d.status;
        // Filter only completed, cancelled, rejected, or refunded
        if (
          stat === "completed" ||
          stat === "rejected" ||
          stat === "cancelled" ||
          d.status === "completed" ||
          d.status === "cancelled" ||
          d.status === "refunded"
        ) {
          docs.push({
            id: docSnap.id,
            customerId: d.customerId,
            userId: d.userId,
            customerName: d.customerName,
            customerEmail: d.customerEmail,
            customerPhone: d.customerPhone,
            photographerId: d.photographerId,
            photographerName: d.photographerName,
            photographerEmail: d.photographerEmail,
            eventName: d.eventName || "",
            eventType: d.eventType,
            eventDate: d.eventDate,
            eventTime: d.eventTime,
            endTime: d.endTime || "",
            eventLocation: d.eventLocation,
            durationHours: d.durationHours ?? 4,
            packageId: d.packageId,
            packageName: d.packageName,
            guestCount: d.guestCount,
            price: d.price,
            currency: d.currency ?? "INR",
            payment: d.payment,
            notes: d.notes,
            photographerNotes: d.photographerNotes,
            cancellationReason: d.cancellationReason,
            roomId: d.roomId,
            status: d.status,
            bookingStatus: d.bookingStatus || d.status,
            confirmedAt: d.confirmedAt,
            completedAt: d.completedAt,
            cancelledAt: d.cancelledAt,
            hasReview: d.hasReview ?? false,
            isArchived: d.isArchived ?? false,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        }
      });

      // Sort by eventDate desc
      docs.sort((a, b) => {
        const timeA = a.eventDate?.seconds || 0;
        const timeB = b.eventDate?.seconds || 0;
        return timeB - timeA;
      });

      setHistory(docs);
      setHistoryLoading(false);
    }, (error) => {
      console.error("Error fetching booking history:", error);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading || !user) {
    return (
      <PublicLayout>
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[80vh] bg-zinc-50 dark:bg-zinc-950 text-foreground py-10 font-sans">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          
          {/* Header & Back link */}
          <div className="space-y-3">
            <Link
              href="/user/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>

            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Booking History
              </h1>
              <p className="text-sm text-muted-foreground">Archive of your completed, declined, and cancelled shoot bookings.</p>
            </div>
          </div>

          {/* Loader */}
          {historyLoading && (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="bg-card border border-border/50 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty History State */}
          {!historyLoading && history.length === 0 && (
            <div className="border border-dashed border-border rounded-3xl py-20 text-center space-y-4 max-w-xl mx-auto bg-card/40">
              <div className="h-12 w-12 bg-secondary text-muted-foreground rounded-full flex items-center justify-center mx-auto border border-border">
                <XCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">No past bookings</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Your shoot history is currently empty. Bookings that have been completed or cancelled will be archived here.
                </p>
              </div>
              <Link href="/user/dashboard">
                <Button variant="outline" size="sm" className="mt-2 text-xs font-bold gap-1 rounded-xl">
                  <Undo2 className="h-3.5 w-3.5" /> Return to Active Dashboard
                </Button>
              </Link>
            </div>
          )}

          {/* Booking Cards Grid */}
          {!historyLoading && history.length > 0 && (
            <div className="space-y-4">
              {history.map((booking) => {
                const eventDateStr = booking.eventDate
                  ? new Date(booking.eventDate.seconds * 1000).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })
                  : "";

                // Resolve status badge styling
                const stat = booking.bookingStatus || booking.status;
                let statusColor = "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
                let statusLabel = "Archived";
                let StatusIcon = XCircle;

                if (stat === "completed") {
                  statusColor = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                  statusLabel = "Completed";
                  StatusIcon = CheckCircle2;
                } else if (stat === "rejected" || stat === "cancelled" || booking.status === "cancelled") {
                  statusColor = "bg-red-500/10 text-red-500 border border-red-500/20";
                  statusLabel = "Declined / Cancelled";
                  StatusIcon = XCircle;
                }

                // Format address cleanly
                const loc = booking.eventLocation;
                const addressParts = [
                  loc?.street,
                  loc?.city,
                  loc?.state,
                  loc?.postalCode
                ].filter(Boolean);
                const formattedAddress = addressParts.length > 0 
                  ? addressParts.join(", ") 
                  : "No address specified";

                return (
                  <div
                    key={booking.id}
                    className="bg-card/50 border border-border/80 rounded-3xl p-6 shadow-xs space-y-4 hover:bg-card transition-colors"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-3">
                      <div>
                        <span className="text-[9px] uppercase font-mono bg-secondary/80 px-2 py-0.5 rounded border border-border text-muted-foreground">
                          ID: {booking.id}
                        </span>
                        <h3 className="text-base font-bold text-foreground mt-1">
                          {booking.packageName || "Custom Package"}
                        </h3>
                        <p className="text-xs text-muted-foreground">Photographer: <strong className="text-foreground">{booking.photographerName}</strong></p>
                      </div>

                      <Badge className={`${statusColor} font-bold text-[10px] uppercase border-none py-1 px-3.5 flex items-center gap-1`}>
                        <StatusIcon className="h-3 w-3" /> {statusLabel}
                      </Badge>
                    </div>

                    {/* Shoot details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="space-y-1">
                        <p className="text-[10px] font-sans font-bold text-muted-foreground uppercase">Schedule & Venue</p>
                        <p className="font-bold text-foreground font-sans flex items-center gap-1 font-mono">
                          <CalendarDays className="h-4 w-4 text-primary shrink-0" /> {eventDateStr}
                        </p>
                        <p className="text-muted-foreground font-sans pl-5">{formattedAddress}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-sans font-bold text-muted-foreground uppercase font-mono">Final Rate & Info</p>
                        <p className="font-bold text-foreground font-sans">
                          ₹{booking.price?.toLocaleString()} ({booking.durationHours || 4} Hours)
                        </p>
                        {booking.cancellationReason && (
                          <p className="text-[10px] text-red-500 font-sans mt-1 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                            <strong>Reason:</strong> {booking.cancellationReason}
                          </p>
                        )}
                        {booking.photographerNotes && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-sans mt-1 bg-amber-500/5 p-2 rounded-lg border border-red-500/10">
                            <strong>Photographer response:</strong> {booking.photographerNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
