import * as React from "react";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full leading-none",
        className
      )}
      aria-hidden="true"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default NotificationBadge;
