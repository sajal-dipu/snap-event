"use client";

import Link from "next/link";
import { CameraOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans select-none text-center">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      {/* Glass card panel */}
      <div className="relative z-10 glass border border-border p-12 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="mx-auto bg-red-500/10 text-red-500 h-16 w-16 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CameraOff className="h-8 w-8" />
        </div>
        <h1 className="text-6xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tighter mb-4">
          404
        </h1>
        <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link href="/">
          <Button variant="gradient" className="w-full justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
