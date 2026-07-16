"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { CreateRoomWizard } from "@/features/rooms/components/CreateRoomWizard";

export default function CreateRoomPage() {
  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6">
        {/* Navigation Breadcrumb / Header */}
        <div className="border-b border-border pb-5 space-y-1">
          <Link
            href="/dashboard/rooms"
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Event Rooms
          </Link>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight pt-1">
            Create Event Room
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure secure sharing access for guests scanning your prints.
          </p>
        </div>

        {/* Wizard Form Stepper */}
        <CreateRoomWizard />
      </div>
    </PhotographerDashboardLayout>
  );
}
