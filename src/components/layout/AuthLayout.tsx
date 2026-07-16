"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background font-sans">
      {/* Left side: Back to site navigation + form panel */}
      <div className="col-span-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 md:p-12">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground">SnapEvent</span>
          </Link>
        </div>

        {/* Authentication Card Content */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto">
          {children}
        </div>

        {/* Legal Disclaimer */}
        <div className="text-center lg:text-left text-xs text-muted-foreground mt-4">
          &copy; {new Date().getFullYear()} SnapEvent Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Modern Visual branding panel */}
      <div className="hidden lg:col-span-7 lg:flex flex-col bg-zinc-950 relative overflow-hidden p-16 justify-between select-none">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(124,58,237,0.15),transparent_50%)]" />
        
        {/* Branding Title */}
        <div className="relative z-10 flex items-center gap-2 text-white">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg shadow-primary/20">
            <Camera className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">SnapEvent</span>
        </div>

        {/* Inspiring Statement */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Preserve and Share Every Unforgettable Event.
          </h2>
          <p className="text-zinc-400 leading-relaxed">
            AI-powered face recognition sorts and matches photos instantly. Guests scan the room QR code and only receive what matters to them—without manual sorting.
          </p>
        </div>

        {/* Premium Graphic Frame */}
        <div className="relative z-10 flex gap-4 text-xs text-zinc-500">
          <span>Stripe-inspired UX</span>
          <span>&middot;</span>
          <span>Apple-grade Design</span>
          <span>&middot;</span>
          <span>Instant Cloud Matching</span>
        </div>
      </div>
    </div>
  );
}
export default AuthLayout;
