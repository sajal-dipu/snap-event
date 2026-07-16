"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types";

/**
 * Returns the current authenticated user's role.
 */
export function useRole(): UserRole | null {
  const { role } = useAuth();
  return role;
}

/**
 * Returns true if the current user is a photographer.
 */
export function useIsPhotographer(): boolean {
  const { role } = useAuth();
  return role === "photographer";
}

/**
 * Returns true if the current user is an admin.
 */
export function useIsAdmin(): boolean {
  const { role } = useAuth();
  return role === "admin";
}
