"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { bookingService } from "@/services/BookingService";
import { notificationService } from "@/services/NotificationService";
import { photographerService } from "@/services/PhotographerService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  FileText,
  DollarSign,
  Users,
  MapPin,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/types";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function BookingsDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pending" | "accepted" | "rejected" | "completed">("pending");
  const [showArchived, setShowArchived] = useState(false);
  const [editingNotesBookingId, setEditingNotesBookingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [messageModalBooking, setMessageModalBooking] = useState<Booking | null>(null);
  const [customMessageText, setCustomMessageText] = useState("");

  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipientId, title, message }: { recipientId: string; title: string; message: string }) => {
      await notificationService.send({
        recipientId,
        recipientRole: "customer",
        type: "custom_message",
        title,
        message,
        relatedId: user?.uid || "",
        relatedType: "photographer"
      });
    },
    onSuccess: () => {
      toast.success("Message sent successfully to the client.");
      setMessageModalBooking(null);
      setCustomMessageText("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to send message.");
    }
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (!user?.uid) return;
    setIsLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("photographerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Booking[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
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
      });
      docs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setBookings(docs);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to photographer bookings:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Action Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status, customerId, photographerName }: { bookingId: string; status: "confirmed" | "cancelled" | "completed"; customerId: string; photographerName: string }) => {
      await bookingService.updateStatus(bookingId, status);
      
      let title = "";
      let msg = "";
      let type: "booking_confirmed" | "booking_cancelled" | "booking_completed" = "booking_confirmed";

      if (status === "confirmed") {
        title = "Booking Request Accepted";
        msg = `Your booking request with ${photographerName} was accepted!`;
        type = "booking_confirmed";
      } else if (status === "cancelled") {
        title = "Booking Request Declined";
        msg = `Your booking request with ${photographerName} was declined.`;
        type = "booking_cancelled";
      } else if (status === "completed") {
        title = "Booking Session Completed";
        msg = `Your session with ${photographerName} has been marked completed.`;
        type = "booking_completed";
        // Also update completed counter
        if (user?.uid) {
          await photographerService.incrementBookingCount(user.uid, "completedBookings");
        }
      }

      await notificationService.send({
        recipientId: customerId,
        recipientRole: "customer",
        type,
        title,
        message: msg,
        relatedId: bookingId,
        relatedType: "booking"
      });
    },
    onSuccess: () => {
      toast.success("Booking status updated successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update booking status.");
    }
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      await bookingService.addInternalNotes(bookingId, notes);
    },
    onSuccess: () => {
      setEditingNotesBookingId(null);
      toast.success("Photographer notes saved.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save internal notes.");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ bookingId, archive }: { bookingId: string; archive: boolean }) => {
      await bookingService.setArchived(bookingId, archive);
    },
    onSuccess: () => {
      toast.success("Booking archive status updated.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update archive status.");
    }
  });

  // Analytics Computations
  const stats = useMemo(() => {
    const counts = {
      total: 0,
      pending: 0,
      accepted: 0,
      completed: 0,
      rejected: 0,
    };

    bookings.forEach((b) => {
      counts.total++;
      if (b.status === "pending") counts.pending++;
      else if (b.status === "confirmed" || b.status === "in_progress") counts.accepted++;
      else if (b.status === "completed") counts.completed++;
      else if (b.status === "cancelled" || b.status === "refunded") counts.rejected++;
    });

    return counts;
  }, [bookings]);

  // Group Bookings by Tab & Archive filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchArchive = showArchived ? b.isArchived === true : !b.isArchived;
      if (!matchArchive) return false;

      if (activeTab === "pending") return b.status === "pending";
      if (activeTab === "accepted") return b.status === "confirmed" || b.status === "in_progress";
      if (activeTab === "completed") return b.status === "completed";
      if (activeTab === "rejected") return b.status === "cancelled" || b.status === "refunded";
      return false;
    });
  }, [bookings, activeTab, showArchived]);

  // Upcoming events list (Confirmed, sorted by eventDate ascending)
  const upcomingEvents = useMemo(() => {
    return bookings
      .filter((b) => b.status === "confirmed" && !b.isArchived)
      .sort((a, b) => {
        const tA = a.eventDate ? a.eventDate.seconds * 1000 : 0;
        const tB = b.eventDate ? b.eventDate.seconds * 1000 : 0;
        return tA - tB;
      })
      .slice(0, 4);
  }, [bookings]);

  // Monthly SVG bar chart calculation
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6Months: { label: string; key: string; count: number }[] = [];
    
    // Build last 6 months list
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        label: `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        count: 0
      });
    }

    // Tally bookings
    bookings.forEach((b) => {
      if (!b.createdAt) return;
      const date = new Date(b.createdAt.seconds * 1000);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      const found = last6Months.find((m) => m.key === yearMonth);
      if (found) {
        found.count++;
      }
    });

    return last6Months;
  }, [bookings]);

  const maxChartCount = Math.max(...monthlyData.map((d) => d.count), 5);

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-8 pb-12">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bookings Manager</h1>
            <p className="text-muted-foreground text-xs">Review booking requests, track upcoming shoots, and log notes.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Link href="/dashboard/bookings/pending">
              <Button
                variant="gradient"
                size="sm"
                className="gap-2 relative"
              >
                <Clock className="h-4 w-4" />
                Pending Requests
                {stats.pending > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                    {stats.pending}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide Archived" : "View Archived Bookings"}
            </Button>
          </div>
        </div>

        {/* 1. Analytics Counters row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Bookings", val: stats.total, color: "border-primary/20 bg-primary/5 text-primary" },
            { label: "Pending", val: stats.pending, color: "border-amber-500/20 bg-amber-500/5 text-amber-500" },
            { label: "Accepted", val: stats.accepted, color: "border-indigo-500/20 bg-indigo-500/5 text-indigo-500" },
            { label: "Completed", val: stats.completed, color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-500" },
            { label: "Rejected/Cancelled", val: stats.rejected, color: "border-red-500/20 bg-red-500/5 text-red-500" }
          ].map((card, idx) => (
            <div key={idx} className={`border rounded-2xl p-4 space-y-1 shadow-sm ${card.color}`}>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{card.label}</p>
              <p className="text-2xl font-black">{card.val}</p>
            </div>
          ))}
        </div>

        {/* 2. Analytics Charts & Upcoming Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SVG Month Chart Card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> Monthly Bookings Trend
            </h3>
            
            {/* Custom SVG Bar Chart */}
            <div className="relative h-48 w-full pt-4">
              <svg className="w-full h-full" viewBox="0 0 500 150">
                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 10 + ratio * 100;
                  return (
                    <line
                      key={idx}
                      x1="30"
                      y1={y}
                      x2="480"
                      y2={y}
                      stroke="currentColor"
                      className="text-border/40"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Bars */}
                {monthlyData.map((d, idx) => {
                  const barWidth = 36;
                  const x = 50 + idx * 75;
                  const barHeight = (d.count / maxChartCount) * 90;
                  const y = 110 - barHeight;

                  return (
                    <g key={idx} className="group cursor-pointer">
                      {/* Glow effect on hover */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        className="fill-primary/20 group-hover:fill-primary/30 transition-all duration-300"
                      />
                      <rect
                        x={x + 3}
                        y={y}
                        width={barWidth - 6}
                        height={barHeight}
                        rx="3"
                        className="fill-primary/80 group-hover:fill-primary transition-all duration-300"
                      />
                      {/* Bar Value Tooltip */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {d.count}
                      </text>
                      {/* Bar Label */}
                      <text
                        x={x + barWidth / 2}
                        y="130"
                        textAnchor="middle"
                        className="text-[9px] font-bold fill-muted-foreground"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Upcoming Shoot Events List */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Calendar className="h-4.5 w-4.5 text-primary" /> Upcoming Shoots
            </h3>
            
            <div className="space-y-3.5">
              {upcomingEvents.map((evt) => (
                <div key={evt.id} className="flex items-center gap-3 bg-secondary/20 p-2.5 rounded-2xl border border-border/40">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl shrink-0">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden flex-grow text-xs">
                    <h4 className="font-bold text-foreground truncate">{evt.customerName}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{evt.eventType} - {evt.eventLocation.street}</p>
                    <p className="text-[9px] text-primary font-semibold mt-0.5">
                      {evt.eventDate ? new Date(evt.eventDate.seconds * 1000).toLocaleDateString() : ""} @ {evt.eventTime}
                    </p>
                  </div>
                </div>
              ))}

              {upcomingEvents.length === 0 && (
                <div className="border border-dashed border-border rounded-2xl py-8 text-center text-muted-foreground italic text-xs">
                  No upcoming shoots confirmed yet.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 3. Bookings list Tabs */}
        <div className="space-y-4">
          <div className="flex border-b border-border bg-card/65 p-1 rounded-2xl border overflow-x-auto scrollbar-none max-w-lg">
            {[
              { id: "pending", label: `Pending (${stats.pending})` },
              { id: "accepted", label: `Accepted (${stats.accepted})` },
              { id: "completed", label: `Completed (${stats.completed})` },
              { id: "rejected", label: `Cancelled (${stats.rejected})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Skeletons loader */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-card border border-border/50 rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-10 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Empty tab state */}
          {!isLoading && filteredBookings.length === 0 && (
            <div className="border border-dashed border-border rounded-3xl py-16 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <h4 className="text-sm font-bold text-foreground">No bookings found</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {showArchived ? "There are no archived bookings matching this status." : "No active bookings matching this status."}
              </p>
            </div>
          )}

          {/* List of cards */}
          {!isLoading && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const bookingDate = booking.createdAt
                  ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString()
                  : "";
                const eventDateStr = booking.eventDate
                  ? new Date(booking.eventDate.seconds * 1000).toLocaleDateString()
                  : "";

                const isPending = booking.status === "pending";
                const isConfirmed = booking.status === "confirmed" || booking.status === "in_progress";

                return (
                  <div
                    key={booking.id}
                    className="bg-card hover:bg-card/90 border border-border rounded-2xl p-5 shadow-sm space-y-4 transition-colors relative overflow-hidden"
                  >
                    {/* Header: Customer Name and Budget */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div>
                        <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                          {booking.customerName}
                          <span className="text-[10px] font-mono bg-secondary/80 px-2 py-0.5 rounded border border-border/50 font-semibold text-muted-foreground">
                            {booking.id}
                          </span>
                        </h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Created: {bookingDate}</p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Estimated Budget</p>
                        <p className="text-base font-extrabold text-foreground flex items-center gap-0.5">
                          <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
                          {booking.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Content Body: Event Specs & Visitor Contacts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Contacts */}
                      <div className="space-y-2 bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                        <p className="font-bold text-foreground">Customer Contacts</p>
                        <div className="space-y-1.5 font-mono">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`mailto:${booking.customerEmail}`} className="hover:text-foreground hover:underline truncate">
                              {booking.customerEmail}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`tel:${booking.customerPhone}`} className="hover:text-foreground hover:underline">
                              {booking.customerPhone || "N/A"}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Shoot Specs */}
                      <div className="space-y-2 bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                        <p className="font-bold text-foreground">Shoot Specifications</p>
                        <div className="space-y-1">
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <span className="font-bold text-foreground shrink-0">Type:</span> {booking.eventType}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-bold text-foreground shrink-0">Schedule:</span> {eventDateStr} @ {booking.eventTime}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-bold text-foreground shrink-0">Location:</span> {booking.eventLocation.street}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-bold text-foreground shrink-0">Guests:</span> {booking.guestCount || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {booking.notes && (
                      <div className="bg-secondary/20 p-3 rounded-xl border border-border/40 text-xs">
                        <p className="font-bold text-foreground mb-1">Customer Notes:</p>
                        <p className="text-muted-foreground italic leading-relaxed">&ldquo;{booking.notes}&rdquo;</p>
                      </div>
                    )}

                    {/* Internal Photographer Notes */}
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-xs space-y-2">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-500 shrink-0" /> Photographer Internal Notes
                      </p>
                      {editingNotesBookingId === booking.id ? (
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Add internal notes (gear, helpers list, timelines...)"
                            className="h-9 text-xs bg-card"
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                          />
                          <Button
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => saveNotesMutation.mutate({ bookingId: booking.id, notes: tempNotes })}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => setEditingNotesBookingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center gap-4">
                          <p className="text-muted-foreground italic">
                            {booking.photographerNotes || "No internal notes logged. Click edit to log notes."}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold"
                            onClick={() => {
                              setEditingNotesBookingId(booking.id);
                              setTempNotes(booking.photographerNotes || "");
                            }}
                          >
                            Edit Note
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Action controls */}
                    <div className="border-t border-border/50 pt-4 flex flex-wrap items-center justify-between gap-4">
                      {/* Left: Quick Archive toggler & Message User */}
                      <div className="flex items-center gap-2">
                        {booking.status !== "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
                            onClick={() => archiveMutation.mutate({ bookingId: booking.id, archive: !booking.isArchived })}
                          >
                            <Archive className="h-4 w-4" />
                            {booking.isArchived ? "Unarchive" : "Archive"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/5 text-xs gap-1.5"
                          onClick={() => {
                            setMessageModalBooking(booking);
                            setCustomMessageText("");
                          }}
                        >
                          <Mail className="h-4 w-4" /> Message User
                        </Button>
                      </div>

                      {/* Right: Accept/Reject/Complete triggers */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-500 hover:bg-red-500/10 gap-1.5 text-xs h-9"
                              onClick={() => updateStatusMutation.mutate({
                                bookingId: booking.id,
                                status: "cancelled",
                                customerId: booking.customerId,
                                photographerName: user?.displayName || "Photographer"
                              })}
                            >
                              <XCircle className="h-4 w-4" /> Reject Booking
                            </Button>
                            <Button
                              variant="gradient"
                              size="sm"
                              className="gap-1.5 text-xs h-9"
                              onClick={() => updateStatusMutation.mutate({
                                bookingId: booking.id,
                                status: "confirmed",
                                customerId: booking.customerId,
                                photographerName: user?.displayName || "Photographer"
                              })}
                            >
                              <CheckCircle className="h-4 w-4" /> Accept Booking
                            </Button>
                          </>
                        )}

                        {isConfirmed && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9"
                            onClick={() => updateStatusMutation.mutate({
                              bookingId: booking.id,
                              status: "completed",
                              customerId: booking.customerId,
                              photographerName: user?.displayName || "Photographer"
                            })}
                          >
                            <CheckCircle className="h-4 w-4" /> Mark Completed
                          </Button>
                        )}

                        {booking.status === "completed" && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Completed
                          </span>
                        )}

                        {booking.status === "cancelled" && (
                          <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Declined
                          </span>
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

      {/* Message User modal popup overlay */}
      {messageModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setMessageModalBooking(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground bg-secondary/80 p-1.5 rounded-full transition-all"
            >
              <XCircle className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-foreground">Message {messageModalBooking.customerName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Send a system alert notification or choose a direct channel.</p>
            </div>

            {/* Direct Channel Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <a
                href={`mailto:${messageModalBooking.customerEmail}?subject=SnapEvent Booking Ref: ${messageModalBooking.id}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-border hover:border-primary/30 bg-secondary/15 hover:bg-secondary/35 text-xs font-semibold rounded-xl text-foreground transition-all"
              >
                <Mail className="h-4 w-4 text-primary" /> Send Email
              </a>
              <a
                href={`https://wa.me/${(messageModalBooking.customerPhone || "").replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 border border-border hover:border-emerald-500/30 bg-secondary/15 hover:bg-secondary/35 text-xs font-semibold rounded-xl text-foreground transition-all"
              >
                <Clock className="h-4 w-4 text-emerald-500" /> WhatsApp Chat
              </a>
            </div>

            {/* System Message composer */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Send In-App Notification</label>
              <Textarea
                rows={3}
                placeholder="Type your custom message to client here..."
                value={customMessageText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessageText(e.target.value)}
                className="text-xs"
              />
              <Button
                variant="gradient"
                size="sm"
                className="w-full mt-2"
                disabled={sendMessageMutation.isPending || !customMessageText.trim()}
                onClick={() => sendMessageMutation.mutate({
                  recipientId: messageModalBooking.customerId,
                  title: `Message from ${user?.displayName || "Photographer"}`,
                  message: customMessageText
                })}
              >
                {sendMessageMutation.isPending ? "Sending Message..." : "Send Alert Notification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PhotographerDashboardLayout>
  );
}
