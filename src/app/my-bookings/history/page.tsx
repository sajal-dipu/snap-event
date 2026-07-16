"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookingHistoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/user/bookings/history");
  }, [router]);

  return null;
}
