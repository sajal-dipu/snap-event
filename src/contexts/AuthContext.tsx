"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { authService } from "@/services/AuthService";
import { setRoleCookie, firebaseSignOut, sendVerificationEmail } from "@/lib/firebase/authService";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import { logger } from "@/utils/logger";
import type { UserRole } from "@/types";
import { useTheme } from "@/providers/ThemeProvider";

// ────────────────────────────────────────────────────────────
// CONTEXT TYPE
// ────────────────────────────────────────────────────────────

interface AuthContextValue {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  emailVerified: boolean;
  role: UserRole | null;

  // Actions
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ────────────────────────────────────────────────────────────
// PROVIDER
// ────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, isAuthenticated, isLoading, setAuth, setLoading, logout: storeLogout } =
    useAuthStore();

  const { theme, setTheme } = useTheme();

  // Sync and persist theme for logged-in user
  const prevUserUidRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      const storageKey = `snappevent-theme-${user.uid}`;
      
      // Case 1: User just logged in or user changed
      if (prevUserUidRef.current !== user.uid) {
        prevUserUidRef.current = user.uid;
        const savedTheme = localStorage.getItem(storageKey);
        if (savedTheme) {
          setTheme(savedTheme as any);
        } else if (theme) {
          localStorage.setItem(storageKey, theme);
        }
      } 
      // Case 2: Theme changed while user is logged in
      else if (theme) {
        localStorage.setItem(storageKey, theme);
      }
    } else {
      prevUserUidRef.current = null;
    }
  }, [user?.uid, theme, setTheme]);

  // Force reload when navigating back via browser back button to refresh dynamic auth check
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  /**
   * Resolve the user's role from Firestore and build AuthUser.
   */
  const resolveAndSetUser = useCallback(
    async (firebaseUser: FirebaseUser) => {
      try {
        let role = await authService.resolveUserRole(firebaseUser.uid);
        if (role === "customer") {
          role = "user";
        }

        // If the user exists in Firebase Auth but has no Firestore record yet,
        // treat them as unauthenticated (signup flow may not be complete).
        if (!role) {
          logger.warn(`No Firestore role found for UID: ${firebaseUser.uid}`);
          setAuth(null);
          return;
        }

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role,
          emailVerified: firebaseUser.emailVerified,
        };

        setAuth(authUser);
        setRoleCookie(role as "photographer" | "admin");
      } catch (error) {
        logger.error("Failed to resolve user role:", error);
        setAuth(null);
      }
    },
    [setAuth]
  );

  /**
   * Subscribe to Firebase Auth state changes.
   */
  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await resolveAndSetUser(firebaseUser);
      } else {
        setAuth(null);
      }
    });

    return () => unsubscribe();
  }, [resolveAndSetUser, setAuth, setLoading]);

  /**
   * Sign out the user completely.
   */
  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        // Clear all cached states
        localStorage.clear();
        sessionStorage.clear();
        // Clear cookie
        document.cookie =
          "snapEvent-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
      await firebaseSignOut();
      storeLogout();
    } catch (error) {
      logger.error("Logout failed:", error);
    }
  }, [storeLogout]);

  /**
   * Re-send the verification email to the current Firebase user.
   */
  const resendVerificationEmail = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No authenticated user found.");
    await sendVerificationEmail(currentUser);
  }, []);

  /**
   * Force-refresh the current Firebase user token and re-sync state.
   * Useful after the user verifies their email and comes back.
   */
  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await currentUser.reload();
    await resolveAndSetUser(currentUser);
  }, [resolveAndSetUser]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    emailVerified: user?.emailVerified ?? false,
    role: user?.role ?? null,
    logout,
    resendVerificationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export default AuthProvider;
