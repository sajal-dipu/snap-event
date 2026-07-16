"use client";

import React, { useState, useEffect } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { notificationService } from "@/services/NotificationService";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import {
  CalendarDays,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  User,
  Mail,
  Phone,
  Trash2,
  CheckCheck,
  History
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Booking, Notification } from "@/types";

export default function UserDashboardPage() {
  const { user, isLoading } = useRequireAuth({ requiredRole: "user" });
  const [activeTab, setActiveTab] = useState<"bookings" | "notifications" | "profile">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsSubTab, setBookingsSubTab] = useState<"all" | "pending" | "accepted" | "rejected" | "completed">("all");
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 1. Subscribe to Bookings Real-time
  useEffect(() => {
    if (!user?.uid) return;

    setBookingsLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("customerId", "==", user.uid)
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
      setBookingsLoading(false);
    }, (error) => {
      console.error("Error listening to customer bookings:", error);
      setBookingsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Subscribe to Notifications Real-time
  useEffect(() => {
    if (!user?.uid) return;
    setNotificationsLoading(true);

    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
      setNotificationsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fetch User Profile Doc
  useEffect(() => {
    if (!user?.uid) return;
    setProfileLoading(true);

    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          setProfileData(snap.data());
        }
      })
      .catch((err) => console.error("Error fetching profile doc:", err))
      .finally(() => setProfileLoading(false));
  }, [user]);

  // 4. Sub-filter Bookings
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      if (bookingsSubTab === "all") return true;
      if (bookingsSubTab === "pending") {
        return b.bookingStatus === "pending" || b.status === "pending";
      }
      if (bookingsSubTab === "accepted") {
        return b.bookingStatus === "accepted" || b.status === "confirmed" || b.status === "in_progress";
      }
      if (bookingsSubTab === "rejected") {
        return b.bookingStatus === "rejected" || b.status === "cancelled";
      }
      if (bookingsSubTab === "completed") {
        return b.bookingStatus === "completed" || b.status === "completed";
      }
      return false;
    });
  }, [bookings, bookingsSubTab]);

  // 5. Notification actions
  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    try {
      await notificationService.markAllRead(user.uid);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all read");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      toast.success("Notification deleted");
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  if (isLoading || !user) {
    return (
      <PublicLayout>
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
        </div>
      </PublicLayout>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PublicLayout>
      <div className="min-h-[80vh] bg-zinc-50 dark:bg-zinc-950 text-foreground py-10 font-sans">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">User Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your event shoots, track requests, and check notifications.</p>
            </div>
            
            {/* Booking History Link */}
            <Link href="/user/bookings/history">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl font-bold">
                <History className="h-4 w-4" /> View Booking History
              </Button>
            </Link>
          </div>

          {/* Navigation Tabs (Dashboard tabs) */}
          <div className="flex border-b border-border bg-card/60 p-1.5 rounded-2xl border overflow-x-auto scrollbar-none max-w-md gap-1">
            {[
              { id: "bookings", label: "My Bookings" },
              { id: "notifications", label: `Notifications` },
              { id: "profile", label: "Profile" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-grow text-center py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "notifications" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full inline-flex items-center justify-center font-extrabold border border-card animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ──── TAB 1: MY BOOKINGS ──── */}
          {activeTab === "bookings" && (
            <div className="space-y-6">
              {/* Status Filters subtabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All Shoots" },
                  { id: "pending", label: "Pending" },
                  { id: "accepted", label: "Accepted" },
                  { id: "rejected", label: "Rejected" },
                  { id: "completed", label: "Completed" }
                ].map((subTab) => (
                  <button
                    key={subTab.id}
                    onClick={() => setBookingsSubTab(subTab.id as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      bookingsSubTab === subTab.id
                        ? "bg-foreground border-foreground text-background font-bold shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {subTab.label}
                  </button>
                ))}
              </div>

              {bookingsLoading && (
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

              {!bookingsLoading && filteredBookings.length === 0 && (
                <div className="border border-dashed border-border rounded-3xl py-16 text-center space-y-4 bg-card/40">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">No shoots found</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      No bookings match the status &ldquo;{bookingsSubTab}&rdquo;. Try browsing photographers to book a session.
                    </p>
                  </div>
                  <Link href="/photographers">
                    <Button variant="outline" size="sm" className="mt-2 text-xs">
                      Browse Photographers
                    </Button>
                  </Link>
                </div>
              )}

              {!bookingsLoading && filteredBookings.length > 0 && (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const eventDateStr = booking.eventDate
                      ? new Date(booking.eventDate.seconds * 1000).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })
                      : "";

                    // Resolve status badge styling
                    let statusColor = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                    let statusLabel = "Pending Confirmation";

                    if (booking.bookingStatus === "accepted" || booking.status === "confirmed" || booking.status === "in_progress") {
                      statusColor = "bg-green-500/10 text-green-500 border border-green-500/20";
                      statusLabel = "Accepted / Confirmed";
                    } else if (booking.bookingStatus === "completed" || booking.status === "completed") {
                      statusColor = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                      statusLabel = "Completed";
                    } else if (booking.bookingStatus === "rejected" || booking.status === "cancelled") {
                      statusColor = "bg-red-500/10 text-red-500 border border-red-500/20";
                      statusLabel = "Declined / Cancelled";
                    }

                    // Resolve payment status badge
                    const paymentStatus = booking.payment?.status || "unpaid";
                    let payColor = "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20";
                    if (paymentStatus === "paid") {
                      payColor = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
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
                        className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-3">
                          <div>
                            <span className="text-[9px] uppercase font-mono bg-secondary/80 px-2 py-0.5 rounded border border-border text-muted-foreground">
                              ID: {booking.id}
                            </span>
                            <h3 className="text-lg font-bold text-foreground mt-1">
                              {booking.packageName || "Custom Package"}
                            </h3>
                            <p className="text-xs text-muted-foreground">Photographer: <strong className="text-foreground">{booking.photographerName}</strong></p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className={`${statusColor} font-bold text-[10px] uppercase border-none py-1 px-3.5`}>
                              {statusLabel}
                            </Badge>
                            <Badge className={`${payColor} font-bold text-[10px] uppercase border-none py-1 px-3.5`}>
                              Payment: {paymentStatus}
                            </Badge>
                          </div>
                        </div>

                        {/* Event Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div className="space-y-2 bg-secondary/5 p-3.5 rounded-xl border border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase font-sans">Schedule & Duration</p>
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 font-bold text-foreground font-sans">
                                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                                {eventDateStr}
                              </p>
                              <p className="flex items-center gap-1.5 text-muted-foreground font-sans">
                                <Clock className="h-4 w-4 text-primary shrink-0" />
                                {booking.eventTime} {booking.endTime ? `to ${booking.endTime}` : ""} ({booking.durationHours || 4} Hours)
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 bg-secondary/5 p-3.5 rounded-xl border border-border/30">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase font-sans">Location Details</p>
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 font-bold text-foreground font-sans truncate">
                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                {formattedAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Budget Price</p>
                            <p className="text-lg font-black text-foreground">₹{booking.price?.toLocaleString()}</p>
                          </div>
                          
                          {booking.notes && (
                            <div className="text-xs text-muted-foreground bg-secondary/10 p-2.5 rounded-xl max-w-md w-full sm:w-auto italic">
                              &ldquo;{booking.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ──── TAB 2: NOTIFICATIONS ──── */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-extrabold text-sm text-foreground">Notifications Log</h3>
                {notifications.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs font-bold gap-1 rounded-xl">
                    <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
                  </Button>
                )}
              </div>

              {notificationsLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="bg-card border border-border/50 rounded-2xl p-4 space-y-2 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  ))}
                </div>
              )}

              {!notificationsLoading && notifications.length === 0 && (
                <div className="border border-dashed border-border rounded-3xl py-16 text-center space-y-2 bg-card/40">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h3 className="text-sm font-bold text-foreground">All caught up!</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    You have no notifications yet. Photographer updates regarding your booking requests will arrive here.
                  </p>
                </div>
              )}

              {!notificationsLoading && notifications.length > 0 && (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`border rounded-2xl p-4 flex gap-3 transition-colors ${
                        notif.isRead 
                          ? "bg-card/50 border-border/40 text-muted-foreground" 
                          : "bg-card border-primary/20 shadow-xs text-foreground"
                      }`}
                    >
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${notif.isRead ? "bg-zinc-300 dark:bg-zinc-700" : "bg-primary animate-pulse"}`} />
                          <h4 className="text-sm font-bold">{notif.title}</h4>
                        </div>
                        <p className="text-xs pl-4">{notif.message}</p>
                        {notif.createdAt && (
                          <p className="text-[10px] text-muted-foreground pl-4 font-mono">
                            {new Date(notif.createdAt.seconds * 1000).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-center">
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark read"
                            onClick={() => handleMarkRead(notif.id)}
                            className="h-8 w-8 hover:bg-secondary rounded-full"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="h-8 w-8 hover:bg-red-500/10 text-red-500 hover:text-red-500 rounded-full"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──── TAB 3: PROFILE ──── */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {profileLoading && (
                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-4 animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded-full mx-auto" />
                  <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
                  <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                </div>
              )}

              {!profileLoading && (
                <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 max-w-xl mx-auto">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary border border-primary/20 mx-auto flex items-center justify-center text-2xl font-black uppercase">
                      {profileData?.name?.charAt(0) || user?.displayName?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{profileData?.name || user?.displayName || "User"}</h3>
                      <span className="bg-secondary px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold text-muted-foreground border border-border/50">
                        {profileData?.role || "Client / User"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border/50 pt-5 space-y-3 text-xs">
                    <div className="flex items-center gap-3 bg-secondary/10 p-3 rounded-xl border border-border/40">
                      <Mail className="h-4.5 w-4.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Email Address</p>
                        <p className="font-semibold text-foreground">{profileData?.email || user?.email}</p>
                      </div>
                    </div>

                    {profileData?.phone && (
                      <div className="flex items-center gap-3 bg-secondary/10 p-3 rounded-xl border border-border/40">
                        <Phone className="h-4.5 w-4.5 text-primary shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Phone Number</p>
                          <p className="font-semibold text-foreground">{profileData.phone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 bg-secondary/10 p-3 rounded-xl border border-border/40">
                      <User className="h-4.5 w-4.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">User Account ID</p>
                        <p className="font-semibold text-foreground font-mono text-[10px]">{user?.uid}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
