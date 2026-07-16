"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { adminService } from "@/services/AdminService";
import { bookingService } from "@/services/BookingService";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { CalendarCheck, ShieldAlert, CheckCircle, XCircle, Archive, Trash2, Calendar, MapPin, User, Camera } from "lucide-react";
import type { Booking } from "@/types";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadBookings = React.useCallback(async () => {
    try {
      const list = await adminService.listAllBookings();
      setBookings(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load booking ledger");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleUpdateStatus = async (bookingId: string, status: "completed" | "cancelled") => {
    setIsSubmitting(true);
    try {
      await bookingService.updateStatus(
        bookingId,
        status,
        status === "cancelled" ? "Cancelled by administrative directives" : undefined
      );
      toast.success(`Booking status updated to ${status}.`);
      loadBookings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update booking status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (bookingId: string, currentArchived: boolean) => {
    setIsSubmitting(true);
    try {
      await bookingService.setArchived(bookingId, !currentArchived);
      toast.success(currentArchived ? "Booking restored from archive" : "Booking moved to archive");
      loadBookings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update archive status");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Retrieving system bookings...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 select-none">
        
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-7 w-7 text-primary" />
            Booking Records Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track reservation details, force status modifications, or adjust log archiving flags.
          </p>
        </div>

        {/* List Table */}
        {bookings.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/20 py-24 text-center max-w-md mx-auto">
            <CardContent className="space-y-3">
              <CalendarCheck className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <h4 className="font-extrabold text-sm text-foreground">No bookings registered</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                All customer bookings and photographer events will show up in this history registry.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Event Details</th>
                    <th className="p-4">Customer Info</th>
                    <th className="p-4">Photographer Info</th>
                    <th className="p-4">Booking Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const eventDateStr = b.eventDate?.toDate ? new Date(b.eventDate.toDate()).toLocaleDateString() : "Pending";
                    const isPending = b.status === "pending";
                    const isConfirmed = b.status === "confirmed" || b.status === "in_progress";
                    const isCompleted = b.status === "completed";
                    const isCancelled = b.status === "cancelled" || b.status === "refunded";

                    return (
                      <tr key={b.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        {/* 1. Event Details */}
                        <td className="p-4 space-y-1">
                          <p className="font-black text-foreground">{b.eventType}</p>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {eventDateStr}
                          </p>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {b.eventLocation?.street || "No location details"}
                          </p>
                        </td>

                        {/* 2. Customer Info */}
                        <td className="p-4 space-y-1">
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            {b.customerName}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono leading-none">{b.customerEmail}</p>
                        </td>

                        {/* 3. Photographer Info */}
                        <td className="p-4 space-y-1">
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            {b.photographerName}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono leading-none">{b.photographerEmail}</p>
                        </td>

                        {/* 4. Booking Status */}
                        <td className="p-4 space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            isCompleted
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                              : isCancelled
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                              : isConfirmed
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                          }`}>
                            {b.status}
                          </span>
                          
                          {/* Price details */}
                          <p className="text-[10px] font-extrabold text-foreground mt-0.5">
                            ₹{b.price.toLocaleString()} {b.currency}
                          </p>
                        </td>

                        {/* 5. Actions */}
                        <td className="p-4 text-right space-x-1 shrink-0 whitespace-nowrap">
                          {isConfirmed && (
                            <Button
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => handleUpdateStatus(b.id, "completed")}
                              className="h-8 px-2.5 rounded-lg text-[9px] font-black bg-primary text-primary-foreground gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Complete
                            </Button>
                          )}

                          {!isCancelled && !isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSubmitting}
                              onClick={() => handleUpdateStatus(b.id, "cancelled")}
                              className="h-8 w-8 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/10"
                              title="Cancel Booking"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleToggleArchive(b.id, b.isArchived || false)}
                            className={`h-8 w-8 rounded-lg ${
                              b.isArchived ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" : "text-zinc-500 hover:text-zinc-650 hover:bg-zinc-500/10"
                            }`}
                            title={b.isArchived ? "Unarchive Booking" : "Archive Booking"}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-border">
              {bookings.map((b) => {
                const eventDateStr = b.eventDate?.toDate ? new Date(b.eventDate.toDate()).toLocaleDateString() : "Pending";
                const isPending = b.status === "pending";
                const isConfirmed = b.status === "confirmed" || b.status === "in_progress";
                const isCompleted = b.status === "completed";
                const isCancelled = b.status === "cancelled" || b.status === "refunded";

                return (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-foreground text-sm">{b.eventType}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {eventDateStr}
                        </p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {b.eventLocation?.street || "No location details"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          isCompleted
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                            : isCancelled
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : isConfirmed
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                        }`}>
                          {b.status}
                        </span>
                        <p className="text-[10px] font-black text-foreground">
                          ₹{b.price.toLocaleString()} {b.currency}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-zinc-900/20 p-2.5 rounded-2xl border border-border">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Customer</span>
                        <p className="font-semibold text-foreground text-xs truncate flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          {b.customerName}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono truncate">{b.customerEmail}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Photographer</span>
                        <p className="font-semibold text-foreground text-xs truncate flex items-center justify-end gap-1">
                          <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          {b.photographerName}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono truncate">{b.photographerEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {isConfirmed && (
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleUpdateStatus(b.id, "completed")}
                          className="flex-1 h-8 rounded-lg text-xs font-black bg-primary text-primary-foreground gap-1.5 flex items-center justify-center"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Complete
                        </Button>
                      )}

                      {!isCancelled && !isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleUpdateStatus(b.id, "cancelled")}
                          className="h-8 px-3 rounded-lg text-xs font-semibold text-red-500 hover:text-red-650 hover:bg-red-500/10 border-border flex items-center justify-center gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleToggleArchive(b.id, b.isArchived || false)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 border-border ${
                          b.isArchived ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" : "text-zinc-500 hover:text-zinc-650 hover:bg-zinc-500/10"
                        }`}
                      >
                        <Archive className="h-3.5 w-3.5" /> {b.isArchived ? "Unarchive" : "Archive"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AdminDashboardLayout>
  );
}
