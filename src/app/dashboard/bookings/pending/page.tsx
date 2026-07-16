"use client";

import React, { useState, useEffect } from "react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { bookingService } from "@/services/BookingService";
import { notificationService } from "@/services/NotificationService";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Clock,
  CalendarDays,
  MapPin,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import type { Booking } from "@/types";

export default function PendingBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("photographerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingDocs: Booking[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.status === "pending" || d.bookingStatus === "pending") {
          pendingDocs.push({
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

      pendingDocs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setBookings(pendingDocs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to pending bookings:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (booking: Booking) => {
    setIsProcessing(booking.id);
    try {
      await bookingService.updateStatus(booking.id, "accepted");
      
      // Dispatch notification
      try {
        await notificationService.send({
          recipientId: booking.customerId,
          recipientRole: "customer",
          type: "booking_confirmed",
          title: "Booking Request Accepted",
          message: `Your booking request with ${user?.displayName || "Photographer"} was accepted!`,
          relatedId: booking.id,
          relatedType: "booking"
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch customer notification:", notifErr);
      }

      toast.success("Booking accepted! Client has been notified.");
    } catch (error: any) {
      console.error("Failed to accept booking:", error);
      toast.error(error?.message || "Failed to accept booking.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (booking: Booking) => {
    setIsProcessing(booking.id);
    try {
      await bookingService.updateStatus(booking.id, "rejected");

      // Dispatch notification
      try {
        await notificationService.send({
          recipientId: booking.customerId,
          recipientRole: "customer",
          type: "booking_cancelled",
          title: "Booking Request Declined",
          message: `Your booking request with ${user?.displayName || "Photographer"} was declined.`,
          relatedId: booking.id,
          relatedType: "booking"
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch customer notification:", notifErr);
      }

      toast.info("Booking request declined.");
    } catch (error: any) {
      console.error("Failed to decline booking:", error);
      toast.error(error?.message || "Failed to decline booking.");
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Back Link & Header */}
        <div className="space-y-3">
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bookings Manager
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="bg-amber-500/10 text-amber-500 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider flex items-center gap-1 w-max mb-1.5 border border-amber-500/20">
                <Clock className="h-3 w-3 animate-pulse" /> Pending Requests Inbox
              </span>
              <h1 className="text-2xl font-bold text-foreground">Booking Inbox</h1>
              <p className="text-muted-foreground text-xs">Manage your pending client requests. Review notes and event specifications before accepting.</p>
            </div>
          </div>
        </div>

        {/* Real-time Loading / Skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-20 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Empty Inbox State */}
        {!isLoading && bookings.length === 0 && (
          <div className="border border-dashed border-border rounded-3xl py-20 text-center space-y-4 max-w-2xl mx-auto bg-card/40 backdrop-blur-xs">
            <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Your booking inbox is empty</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No pending requests at the moment. New requests from your public profile calendar will appear here.
              </p>
            </div>
            <Link href="/dashboard/bookings">
              <Button size="sm" variant="outline" className="mt-2 text-xs">
                Go to Bookings Manager
              </Button>
            </Link>
          </div>
        )}

        {/* Booking Cards Grid */}
        {!isLoading && bookings.length > 0 && (
          <div className="grid grid-cols-1 gap-6 max-w-4xl">
            {bookings.map((booking) => {
              const bookingDateStr = booking.createdAt
                ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString([], { dateStyle: "medium" })
                : "Just now";
              const eventDateStr = booking.eventDate
                ? new Date(booking.eventDate.seconds * 1000).toLocaleDateString([], { dateStyle: "full" })
                : "";

              // Format Address cleanly
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
                  className="bg-card hover:bg-card/90 border border-border rounded-3xl p-6 shadow-sm space-y-5 transition-colors relative overflow-hidden"
                >
                  {/* Card Header: Client Name, Id & Price */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                    <div>
                      <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
                        {booking.customerName}
                        <span className="text-[10px] font-mono bg-secondary/80 px-2 py-0.5 rounded border border-border/50 font-semibold text-muted-foreground">
                          {booking.id}
                        </span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Request received: {bookingDateStr}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Proposed Budget</p>
                      <p className="text-lg font-black text-foreground flex items-center gap-0.5">
                        <span className="text-emerald-500 mr-0.5">₹</span>
                        {booking.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Body Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    {/* Customer Contacts */}
                    <div className="space-y-2.5 bg-secondary/10 p-4 rounded-2xl border border-border/40">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-primary shrink-0" /> Contacts & Channel
                      </p>
                      <div className="space-y-2 font-mono">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-bold text-foreground select-none shrink-0 w-12 text-[10px]">Email:</span>
                          <a href={`mailto:${booking.customerEmail}`} className="hover:text-foreground hover:underline truncate">
                            {booking.customerEmail}
                          </a>
                        </div>
                        {booking.customerPhone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-bold text-foreground select-none shrink-0 w-12 text-[10px]">Phone:</span>
                            <a href={`tel:${booking.customerPhone}`} className="hover:text-foreground hover:underline">
                              {booking.customerPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Specifications */}
                    <div className="space-y-2.5 bg-secondary/10 p-4 rounded-2xl border border-border/40">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" /> Specifications
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <span className="font-bold text-foreground shrink-0">Type:</span> {booking.eventType}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <span className="font-bold text-foreground shrink-0">Date:</span> {eventDateStr}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <span className="font-bold text-foreground shrink-0">Guests:</span> {booking.guestCount || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Address details */}
                  <div className="flex items-start gap-2.5 bg-secondary/20 p-4 rounded-2xl border border-border/40 text-xs">
                    <MapPin className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-foreground">Shoot Venue Address</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{formattedAddress}</p>
                    </div>
                  </div>

                  {/* Client Notes / Instructions */}
                  {booking.notes && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl text-xs space-y-1.5">
                      <p className="font-bold text-amber-500 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 shrink-0" /> Client Notes
                      </p>
                      <p className="text-muted-foreground italic leading-relaxed">&ldquo;{booking.notes}&rdquo;</p>
                    </div>
                  )}

                  {/* Accept / Reject actions */}
                  <div className="border-t border-border/50 pt-5 flex items-center justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isProcessing === booking.id}
                      className="text-red-500 hover:text-red-500 hover:bg-red-500/10 gap-1.5 text-xs h-10 px-4 rounded-xl"
                      onClick={() => handleReject(booking)}
                    >
                      <XCircle className="h-4.5 w-4.5" />
                      Reject Booking
                    </Button>
                    <Button
                      variant="gradient"
                      size="sm"
                      disabled={isProcessing === booking.id}
                      className="gap-1.5 text-xs h-10 px-5 rounded-xl font-bold shadow-md"
                      onClick={() => handleAccept(booking)}
                    >
                      <CheckCircle className="h-4.5 w-4.5" />
                      Accept Booking
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
