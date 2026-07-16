"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Calendar, Clock, MapPin, Users, Sparkles, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { bookingService } from "@/services/BookingService";
import { notificationService } from "@/services/NotificationService";
import { useAuth } from "@/contexts/AuthContext";
import type { Photographer } from "@/types";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  photographer: Photographer;
  initialBudget?: string;
  initialNotes?: string;
  initialDate?: string;
}

export function BookingFormModal({
  isOpen,
  onClose,
  photographer,
  initialBudget,
  initialNotes,
  initialDate
}: BookingFormModalProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState(initialDate || "");
  const [eventTime, setEventTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");
  const [eventLocation, setEventLocation] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [budget, setBudget] = useState(initialBudget || photographer.startingPrice?.toString() || "10000");
  const [guestCount, setGuestCount] = useState("50");
  const [notes, setNotes] = useState(initialNotes || "");

  const photographerPackages = photographer.packages || photographer.pricingPackages || [];

  // Determine initial package selection
  const initialPkg = initialBudget
    ? photographerPackages.find((p) => p.price.toString() === initialBudget || p.price === parseFloat(initialBudget))
    : photographerPackages[0];

  const [packageId, setPackageId] = useState(initialPkg?.id || "");

  // Prepopulate client profile data if logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerName(user.displayName || "");
      setCustomerEmail(user.email || "");
      
      // Fetch phone number dynamically from firestore users/{uid} to avoid type compilation errors on AuthUser
      import("firebase/firestore").then(({ doc, getDoc }) => {
        import("@/lib/firebase/firestore").then(({ db }) => {
          getDoc(doc(db, "users", user.uid)).then((snap) => {
            if (snap.exists()) {
              setCustomerPhone(snap.data()?.phone || "");
            }
          });
        });
      });
    }
  }, [isAuthenticated, user]);

  const handlePackageChange = (pkgId: string) => {
    setPackageId(pkgId);
    const pkg = photographerPackages.find((p) => p.id === pkgId);
    if (pkg) {
      setBudget(pkg.price.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic Validation
    if (!customerName || !customerPhone || !customerEmail || !eventDate || !eventLocation || !city || !stateName || !pincode || !budget || !guestCount) {
      setError("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    // Validate photographer availability: Users should only book available dates.
    const dateStatus = (photographer.availability as any)?.[eventDate];
    if (dateStatus !== "available") {
      setError("The selected date is not marked as Available. Please select a date marked as Available on the photographer's calendar.");
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      setError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(customerPhone.replace(/\s+/g, ""))) {
      setError("Please enter a valid phone number (e.g. +919876543210).");
      setIsSubmitting(false);
      return;
    }

    try {
      const selectedPkg = photographerPackages.find((p) => p.id === packageId);
      const pkgName = selectedPkg ? (selectedPkg.name || selectedPkg.title) : "Custom Quote";

      // 1. Save Booking in Firestore
      const bookingId = await bookingService.createVisitorBooking({
        photographerId: photographer.uid,
        photographerName: photographer.name,
        photographerEmail: photographer.email,
        customerName,
        customerPhone,
        customerEmail,
        eventType,
        eventDate,
        eventTime,
        endTime,
        eventLocation,
        city,
        state: stateName,
        pincode,
        budget: parseFloat(budget),
        guestCount: parseInt(guestCount, 10),
        notes,
        userId: user?.uid || undefined,
        packageId,
        packageName: pkgName,
        eventName: `${eventType} with ${photographer.name}`
      });

      // 2. Dispatch notification to photographer
      await notificationService.notifyBookingCreated(
        photographer.uid,
        bookingId,
        customerName
      );

      // 3. Redirect to Success Page
      router.push(
        `/booking-success?bookingId=${bookingId}&photographerName=${encodeURIComponent(
          photographer.name
        )}&eventDate=${eventDate}&eventTime=${eventTime}`
      );
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (!isAuthenticated || !user) {
    const handleLoginRedirect = () => {
      onClose();
      router.push(`/auth/login?from=${encodeURIComponent(window.location.pathname)}`);
    };

    const handleSignupRedirect = () => {
      onClose();
      router.push(`/auth/signup?from=${encodeURIComponent(window.location.pathname)}`);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground bg-secondary/80 p-1.5 rounded-full transition-all"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="text-center space-y-4 pt-4">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">Sign In Required</h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Create an account to continue booking.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="default" onClick={handleLoginRedirect} className="w-full">
              Login
            </Button>
            <Button variant="outline" onClick={handleSignupRedirect} className="w-full">
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-pink-950 px-6 py-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white">Book Your Shoot</h2>
              <p className="text-xs text-zinc-300">With {photographer.studioName || photographer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Client Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
              1. Your Contact Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Mobile Number *</label>
                <Input
                  type="tel"
                  required
                  placeholder="e.g. +919876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Package Selection */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
              2. Package Selection
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Select Package *</label>
                <select
                  value={packageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Custom Quote --</option>
                  {photographerPackages.map((pkg: any) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name || pkg.title} (₹{pkg.price.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Estimated Budget (INR) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground text-sm">
                    ₹
                  </span>
                  <Input
                    type="number"
                    required
                    min="1"
                    className="pl-7"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Event Specifications */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
              3. Event Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Wedding</option>
                  <option>Pre Wedding</option>
                  <option>Portrait</option>
                  <option>Fashion</option>
                  <option>Birthday</option>
                  <option>Corporate</option>
                  <option>Maternity/Baby</option>
                  <option>Product/Commercial</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Event Date *
                </label>
                <Input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Start Time *
                </label>
                <Input
                  type="time"
                  required
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> End Time *
                </label>
                <Input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Event Street Address *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Grand Plaza Hall, Sector 15"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">City *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Gurugram"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">State *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Haryana"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Pincode / Postal Code *</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. 122001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" /> Estimated Guests *
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Special Requirements / Notes</label>
                <Textarea
                  placeholder="Describe your vision or custom preferences..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">{notes.length}/500 chars</p>
              </div>
            </div>
          </div>
        </form>

        {/* Action Footer */}
        <div className="bg-card px-4 sm:px-6 lg:px-8 py-4 border-t border-border flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Submitting Booking..." : "Submit Booking Request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
export default BookingFormModal;
