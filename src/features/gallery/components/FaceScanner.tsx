import * as React from "react";

interface FaceScannerProps {
  active?: boolean;
}

export function FaceScanner({ active = true }: FaceScannerProps) {
  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between overflow-hidden rounded-2xl">
      {/* 1. Pulse backdrop */}
      <div className="absolute inset-0 bg-primary/5 animate-pulse duration-1000" />

      {/* 2. Target Corners */}
      <div className="absolute top-6 left-6 h-6 w-6 border-t-2 border-l-2 border-primary rounded-tl-md" />
      <div className="absolute top-6 right-6 h-6 w-6 border-t-2 border-r-2 border-primary rounded-tr-md" />
      <div className="absolute bottom-6 left-6 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
      <div className="absolute bottom-6 right-6 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-md" />

      {/* 3. Scanning Laser Line */}
      <div className="relative w-full h-full">
        <div 
          className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] animate-scan-y"
          style={{
            animation: "scan 2.2s infinite ease-in-out",
          }}
        />
      </div>

      {/* Styles for dynamic scan animation */}
      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 5%;
            opacity: 0.2;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 95%;
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
export default FaceScanner;
