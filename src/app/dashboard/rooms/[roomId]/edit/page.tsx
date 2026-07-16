"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default function EditRoomPage({ params }: PageProps) {
  const router = useRouter();
  const { roomId } = React.use(params);

  React.useEffect(() => {
    if (roomId) {
      router.replace(`/dashboard/rooms/${roomId}?tab=settings`);
    }
  }, [roomId, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground font-medium">Redirecting to Settings...</p>
      </div>
    </div>
  );
}
