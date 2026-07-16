import { create } from "zustand";
import type { UserRole } from "@/types";

// ────────────────────────────────────────────────────────────
// AUTH STORE SHAPE
// ────────────────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  emailVerified: boolean;
}

interface AuthState {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  setEmailVerified: (verified: boolean) => void;
  logout: () => void;
}

// ────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setEmailVerified: (verified) =>
    set((state) => ({
      user: state.user ? { ...state.user, emailVerified: verified } : null,
    })),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));

// ────────────────────────────────────────────────────────────
// SELECTORS (memoization-friendly)
// ────────────────────────────────────────────────────────────

export const selectUser = (s: AuthState) => s.user;
export const selectRole = (s: AuthState) => s.user?.role ?? null;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsLoading = (s: AuthState) => s.isLoading;
export const selectEmailVerified = (s: AuthState) => s.user?.emailVerified ?? false;
