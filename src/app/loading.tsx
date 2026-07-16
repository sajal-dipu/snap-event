import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Visual glowing layout */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading SnapEvent...
        </p>
      </div>
    </div>
  );
}
