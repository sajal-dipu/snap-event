"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to an reporting service if needed
    console.error("Unhandled error boundary catch:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans select-none text-center">
      <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-red-500/5 blur-[80px] pointer-events-none" />

      <div className="relative z-10 glass border border-border p-12 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="mx-auto bg-destructive/10 text-destructive h-16 w-16 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
          Something went wrong!
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          An unexpected error occurred during processing. Please refresh or try again.
        </p>
        
        <div className="flex gap-4">
          <Button variant="outline" className="w-full justify-center gap-2" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
          <Button variant="gradient" className="w-full justify-center gap-2" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
