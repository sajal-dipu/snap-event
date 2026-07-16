"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, onAuthStateChanged } from "firebase/auth";

import {
  SignUpStep1Schema,
  type SignUpStep1Data,
} from "@/lib/validation/authSchemas";
import {
  signUpWithEmail,
  signInWithEmail,
  sendVerificationEmail,
  parseFirebaseAuthError,
} from "@/lib/firebase/authService";
import { photographerService } from "@/services/PhotographerService";
import { auth } from "@/lib/firebase/auth";

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────

export function SignUpWizard() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpStep1Data>({ resolver: zodResolver(SignUpStep1Schema) });

  // ── Guard: redirect existing sessions appropriately ──────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;

      console.log(
        `[Authentication] Active session detected on /signup for: ${firebaseUser.email} (${firebaseUser.uid})`
      );

      try {
        const photographer = await photographerService.getById(firebaseUser.uid);

        if (photographer?.onboardingCompleted) {
          console.log("[Redirect] Onboarding complete → /dashboard");
          router.replace("/dashboard");
          return;
        }

        if (firebaseUser.emailVerified) {
          console.log("[Redirect] Email verified, onboarding incomplete → /onboarding");
          router.replace("/onboarding");
          return;
        }

        console.log("[Redirect] Email not yet verified → /verify-email");
        router.replace("/verify-email");
      } catch (err) {
        console.error("[Firestore] Error during session guard check:", err);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // ── Submit handler ────────────────────────────────────────
  const onSubmit = async (data: SignUpStep1Data) => {
    setIsSubmitting(true);

    try {
      let firebaseUser;

      // 1. Create Firebase Auth user
      try {
        console.log(`[Authentication] Creating new user: ${data.email}`);
        const credential = await signUpWithEmail(data.email, data.password);
        firebaseUser = credential.user;
        console.log(
          `[Authentication] Firebase Auth user created. UID: ${firebaseUser.uid}`
        );
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          console.log(
            `[Authentication] Email already in use. Attempting sign-in for: ${data.email}`
          );

          try {
            const loginCred = await signInWithEmail(data.email, data.password);
            firebaseUser = loginCred.user;
            console.log(
              `[Authentication] Signed in existing user. UID: ${firebaseUser.uid}`
            );
          } catch (loginErr: any) {
            console.error("[Authentication] Auto sign-in failed:", loginErr);
            throw authError; // surface original "email-already-in-use" error
          }

          // Route based on existing account state
          const existingDoc = await photographerService.getById(firebaseUser.uid);

          if (existingDoc?.onboardingCompleted) {
            console.log("[Redirect] Existing user, onboarding complete → /dashboard");
            router.push("/dashboard");
            return;
          }

          if (firebaseUser.emailVerified) {
            console.log(
              "[Redirect] Existing user, email verified, onboarding incomplete → /onboarding"
            );
            router.push("/onboarding");
            return;
          }

          // Email not verified — fall through and re-send verification
          console.log(
            "[Authentication] Existing user, email not verified. Re-sending verification email."
          );
        } else {
          console.error("[Authentication] Signup error:", authError);
          throw authError;
        }
      }

      // 2. Persist display name to Firebase Auth profile
      try {
        console.log(
          `[Authentication] Updating display name to: "${data.fullName}"`
        );
        await updateProfile(firebaseUser, { displayName: data.fullName });
        console.log("[Authentication] Display name updated successfully.");
      } catch (profileErr: any) {
        console.error(
          "[Authentication] Failed to update display name (non-fatal):",
          profileErr
        );
      }

      // 3. Send email verification
      try {
        console.log(
          `[Authentication] Sending verification email to: ${firebaseUser.email}`
        );
        await sendVerificationEmail(firebaseUser);
        console.log(
          `[Authentication] Verification email sent successfully to: ${firebaseUser.email}`
        );
      } catch (verifyErr: any) {
        console.error(
          "[Authentication] Failed to send verification email (non-fatal):",
          verifyErr
        );
        // Non-fatal — user can resend from /verify-email page
      }

      // 4. Redirect to verification page
      toast.success(
        "Account created! A verification email has been sent to your address."
      );
      console.log("[Redirect] → /verify-email");
      router.push("/verify-email");
    } catch (error: any) {
      console.error("[Authentication] Signup failed:", error);
      toast.error(parseFirebaseAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Join SnapEvent
        </h1>
        <p className="text-sm text-muted-foreground">
          Create your photographer account in seconds
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <Field label="Full Name" error={errors.fullName?.message} htmlFor="s1-name">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="s1-name"
              type="text"
              placeholder="Raj Mehta"
              autoComplete="name"
              {...register("fullName")}
              className={inputCls(!!errors.fullName, "pl-10")}
            />
          </div>
        </Field>

        {/* Email */}
        <Field
          label="Email Address"
          error={errors.email?.message}
          htmlFor="s1-email"
        >
          <input
            id="s1-email"
            type="email"
            placeholder="raj@studio.com"
            autoComplete="email"
            {...register("email")}
            className={inputCls(!!errors.email)}
          />
        </Field>

        {/* Phone */}
        <Field
          label="Phone Number"
          error={errors.phone?.message}
          htmlFor="s1-phone"
          hint="Include country code (e.g. +91 98765 43210)"
        >
          <input
            id="s1-phone"
            type="tel"
            placeholder="+91 98765 43210"
            autoComplete="tel"
            {...register("phone")}
            className={inputCls(!!errors.phone)}
          />
        </Field>

        {/* Password */}
        <Field label="Password" error={errors.password?.message} htmlFor="s1-pw">
          <div className="relative">
            <input
              id="s1-pw"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 chars, uppercase, number, symbol"
              autoComplete="new-password"
              {...register("password")}
              className={inputCls(!!errors.password, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        {/* Confirm Password */}
        <Field
          label="Confirm Password"
          error={errors.confirmPassword?.message}
          htmlFor="s1-cpw"
        >
          <div className="relative">
            <input
              id="s1-cpw"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={inputCls(!!errors.confirmPassword, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating Account…
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </a>
      </p>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ────────────────────────────────────────────────────────────

function inputCls(hasError: boolean, extra = "") {
  return `w-full px-3 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${extra} ${
    hasError ? "border-red-500/60 focus:ring-red-500/30" : "border-border"
  }`;
}

function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SignUpWizard;
