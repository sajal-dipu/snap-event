"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Loader2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getDoc,
  getDocs,
  doc,
  collection,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firestore";
import { LoginSchema, type LoginFormData } from "@/lib/validation/authSchemas";
import { signInWithEmail, setRoleCookie } from "@/lib/firebase/authService";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") ?? "/dashboard";
  const verifiedParam = searchParams.get("verified");

  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // ── Step 1: Firebase Authentication ─────────────────────
      // Always authenticate with Firebase first. Never query Firestore before this.
      console.log(`[Authentication] Attempting sign-in for: ${data.email}`);
      const credential = await signInWithEmail(data.email, data.password, data.rememberMe);
      const firebaseUser = credential.user;
      console.log(`[Authentication] Firebase sign-in successful. UID: ${firebaseUser.uid}`);

      // ── Step 2: Email verification check ────────────────────
      if (!firebaseUser.emailVerified) {
        console.log(`[Authentication] Login blocked — email not verified for: ${firebaseUser.email}`);
        toast.warning("Please verify your email first. Check your inbox for the verification link.");
        router.push("/verify-email");
        return;
      }
      console.log(`[Authentication] Email verified. Proceeding with Firestore role check.`);

      // ── Step 3: Admin check ──────────────────────────────────
      // Photographers should use the main login; admins have their own page.
      console.log(`[Firestore] Checking admins/${firebaseUser.uid}`);

      let isAdmin = false;
      const adminSnap = await getDoc(doc(db, "admins", firebaseUser.uid));
      if (adminSnap.exists()) {
        isAdmin = true;
      } else {
        const q = query(collection(db, "admins"), where("uid", "==", firebaseUser.uid));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          isAdmin = true;
        }
      }

      if (isAdmin) {
        console.log(`[Firestore] User ${firebaseUser.uid} is an admin. Blocking photographer login.`);
        setError("email", {
          message: "Use the Admin Login page to access the admin console.",
        });
        setIsSubmitting(false);
        return;
      }
      console.log(`[Firestore] Not an admin. Checking photographers/${firebaseUser.uid}`);

      // ── Step 4: Photographer document lookup ─────────────────
      let hasPhotographerDoc = false;
      const photographerSnap = await getDoc(doc(db, "photographers", firebaseUser.uid));
      if (photographerSnap.exists()) {
        hasPhotographerDoc = true;
      } else {
        const q = query(collection(db, "photographers"), where("uid", "==", firebaseUser.uid));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          hasPhotographerDoc = true;
        }
      }

      if (hasPhotographerDoc) {
        // ── Happy path: document exists → set auth state → /dashboard ──
        console.log(`[Firestore] Photographer document found for UID: ${firebaseUser.uid}. Redirecting to /dashboard.`);

        setAuth({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: "photographer",
          emailVerified: firebaseUser.emailVerified,
        });
        setRoleCookie("photographer");

        toast.success("Welcome back! Redirecting to your dashboard...");
        const redirect = fromPath.startsWith("/dashboard") ? fromPath : "/dashboard";
        router.push(redirect);
      } else {
        // ── Step 4.5: Customer/User document lookup ─────────────────
        console.log(`[Firestore] No photographer document found. Checking users collection.`);
        const customerSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (customerSnap.exists()) {
          const customerData = customerSnap.data();
          const resolvedRole = (customerData?.role === "customer" ? "user" : (customerData?.role || "user")) as UserRole;
          console.log(`[Firestore] User document found for UID: ${firebaseUser.uid}. Role: ${resolvedRole}`);

          setAuth({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: customerData?.name || firebaseUser.displayName,
            photoURL: customerData?.profilePhoto || firebaseUser.photoURL,
            role: resolvedRole,
            emailVerified: firebaseUser.emailVerified,
          });
          setRoleCookie(resolvedRole);

          toast.success("Welcome back! Redirecting...");
          const redirect = (fromPath.startsWith("/dashboard") || fromPath === "/login" || fromPath === "/signup" || fromPath === "/my-bookings" || fromPath === "/")
            ? "/user/dashboard"
            : fromPath;
          router.push(redirect);
        } else {
          // ── No Firestore document yet: account exists but onboarding incomplete ──
          // This happens when a user verified their email but never completed onboarding.
          // Redirect silently to /onboarding — do NOT show "Account not found."
          console.log(
            `[Firestore] No photographer or customer document found for UID: ${firebaseUser.uid}. ` +
            `Account exists but onboarding is incomplete. Redirecting to /onboarding.`
          );

          setAuth({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: "photographer",
            emailVerified: firebaseUser.emailVerified,
          });
          setRoleCookie("photographer");

          toast.info("Please complete your profile setup to continue.");
          router.push("/onboarding");
        }
      }
    } catch (error: any) {
      console.error(error);

      const firebaseErrors: Record<string, string> = {
        "auth/user-not-found": "User account not found.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/network-request-failed": "Network error.",
        "permission-denied": "Firebase rules issue.",
      };

      const code = error?.code || error?.message;
      toast.error(
        firebaseErrors[code] || code
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-7"
    >
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 mb-4 lg:hidden">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Camera className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">SnapEvent</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your photographer account
        </p>
        {verifiedParam === "1" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
          >
            <span>✓</span>
            <span>Email verified! You can now sign in.</span>
          </motion.div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@studio.com"
              {...register("email")}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${errors.email
                  ? "border-red-500/60 focus:ring-red-500/30"
                  : "border-border"
                }`}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400"
              >
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              {...register("password")}
              className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${errors.password
                  ? "border-red-500/60 focus:ring-red-500/30"
                  : "border-border"
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400"
              >
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <input
            id="login-remember"
            type="checkbox"
            {...register("rememberMe")}
            className="h-4 w-4 rounded border-border bg-secondary accent-primary cursor-pointer"
          />
          <label
            htmlFor="login-remember"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Keep me signed in
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in to Dashboard"
          )}
        </button>
      </form>

      {/* Signup Link */}
      <p className="text-center text-sm text-muted-foreground">
        New photographer?{" "}
        <Link
          href="/signup"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Create your account
        </Link>
      </p>
    </motion.div>
  );
}

export default LoginForm;
