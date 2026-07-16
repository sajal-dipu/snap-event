"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Calendar, Clock, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PublicLayout } from "@/components/layout/PublicLayout";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "BK-NEW";
  const photographerName = searchParams.get("photographerName") || "Professional Photographer";
  const eventDate = searchParams.get("eventDate") || "";
  const eventTime = searchParams.get("eventTime") || "";

  return (
    <div className="container mx-auto px-4 py-24 max-w-xl text-center">
      {/* Visual Indicator */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-125 animate-pulse" />
          <CheckCircle2 className="h-16 w-16 text-emerald-500 relative z-10 animate-bounce" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-3">
        Booking Request Sent!
      </h1>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-10 leading-relaxed">
        Your booking request has been submitted successfully. The photographer is reviewing your request and will contact you shortly.
      </p>

      {/* Details Box */}
      <div className="bg-card/65 backdrop-blur-md border border-border/80 rounded-2xl p-6 mb-8 text-left shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Booking Status</span>
          <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold px-2.5 py-0.5 rounded-full uppercase">
            Pending Review
          </span>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Booking Reference:</span>
            <span className="font-mono text-foreground font-semibold bg-secondary/80 px-2 py-0.5 rounded border border-border/50 text-xs">
              {bookingId}
            </span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span>Photographer:</span>
            <span className="text-foreground font-semibold">{photographerName}</span>
          </div>

          {eventDate && (
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary shrink-0" /> Date:</span>
              <span className="text-foreground font-semibold">{new Date(eventDate).toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}</span>
            </div>
          )}

          {eventTime && (
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary shrink-0" /> Start Time:</span>
              <span className="text-foreground font-semibold">{eventTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Trust & Next Steps Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-xs mb-10">
        <div className="flex items-start gap-2 bg-secondary/30 p-3 rounded-xl border border-border/50">
          <Mail className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Email Notifications</p>
            <p className="text-muted-foreground">A confirmation has been sent to your email. Check your spam folder if you do not see it.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-secondary/30 p-3 rounded-xl border border-border/50">
          <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Secure Booking</p>
            <p className="text-muted-foreground">Payment is only required once the photographer confirms date availability.</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/photographers">
          <Button variant="outline" className="w-full sm:w-auto">
            Browse More
          </Button>
        </Link>
        <Link href="/">
          <Button variant="gradient" className="w-full sm:w-auto gap-2">
            Back to Home <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <PublicLayout>
      <Suspense fallback={
        <div className="container mx-auto px-4 py-32 text-center text-muted-foreground">
          Loading Booking Details...
        </div>
      }>
        <SuccessPageContent />
      </Suspense>
    </PublicLayout>
  );
}
