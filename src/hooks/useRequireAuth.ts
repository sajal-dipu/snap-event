"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";

interface UseRequireAuthOptions {
  /** Required role. Redirects if the user's role doesn't match. */
  requiredRole?: UserRole;
  /** Where to redirect unauthenticated users. Default: "/login" */
  redirectTo?: string;
}

/**
 * Client-side auth guard hook.
 * Redirects to /login (or a custom path) if the user is not authenticated.
 * Optionally enforces a specific role.
 *
 * Usage:
 *   const { user, isLoading } = useRequireAuth({ requiredRole: "photographer" });
 */
export function useRequireAuth({ requiredRole, redirectTo = "/login" }: UseRequireAuthOptions = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      // Wrong role — redirect to homepage
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, requiredRole, redirectTo, router]);

  return { user, isLoading, isAuthenticated };
}
