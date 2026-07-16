"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
  LogOut,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────

/** Returns true if the Gmail app / web is likely available on this platform. */
function isGmailLinkAvailable(): boolean {
  if (typeof window === "undefined") return false;
  // Show Gmail button for all platforms; the link gracefully degrades to Gmail web.
  return true;
}

function openGmail() {
  // Try the Gmail app deep-link first (works on Android/iOS); fall back to Gmail web.
  const gmailAppUrl = "googlegmail://";
  const gmailWebUrl = "https://mail.google.com/";
  try {
    window.location.href = gmailAppUrl;
    // If app didn't open within 500ms, redirect to web
    setTimeout(() => {
      window.open(gmailWebUrl, "_blank", "noopener,noreferrer");
    }, 500);
  } catch (err) {
    console.error("[Authentication] Failed to open Gmail app link:", err);
    window.open(gmailWebUrl, "_blank", "noopener,noreferrer");
  }
}

// ────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────

export function EmailVerificationGate() {
  const router = useRouter();
  const { user, logout, resendVerificationEmail, refreshUser } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ── Auto-poll: check verification status every 5 seconds ──
  const checkAndRedirect = useCallback(async (silent = true) => {
    try {
      console.log("[Authentication] Checking email verification status...");
      await refreshUser();
      if (user?.emailVerified) {
        console.log("[Authentication] Email verified! Redirecting to /onboarding.");
        toast.success("Email verified! Redirecting to profile setup...");
        setTimeout(() => router.push("/onboarding"), 1200);
        return true;
      }
      if (!silent) {
        console.log("[Authentication] Email not yet verified.");
        toast.info("Email not verified yet. Please check your inbox.");
      }
      return false;
    } catch (err: any) {
      console.error("[Authentication] Error while checking verification status:", err);
      if (!silent) toast.error("Could not check verification status. Please try again.");
      return false;
    }
  }, [refreshUser, user, router]);

  useEffect(() => {
    const interval = setInterval(() => checkAndRedirect(true), 5000);
    return () => clearInterval(interval);
  }, [checkAndRedirect]);

  // ── Cooldown countdown timer ──
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Handlers ──
  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      console.log(`[Authentication] Resending verification email to: ${user?.email}`);
      await resendVerificationEmail();
      console.log("[Authentication] Verification email resent successfully.");
      toast.success("Verification email sent! Check your inbox.");
      setCooldown(60); // 60-second cooldown
    } catch (err: any) {
      console.error("[Authentication] Failed to resend verification email:", err);
      const code = err?.code ?? "";
      if (code === "auth/too-many-requests") {
        toast.error("Too many requests. Please wait a moment before trying again.");
      } else {
        toast.error("Failed to resend verification email. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    await checkAndRedirect(false);
    setIsChecking(false);
  };

  const handleLogout = async () => {
    try {
      console.log("[Authentication] User signing out from verify-email page.");
      await logout();
      router.push("/login");
    } catch (err: any) {
      console.error("[Authentication] Sign-out failed:", err);
      toast.error("Sign-out failed. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* ── Icon ── */}
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Mail className="h-9 w-9 text-primary" />
          </div>
          {/* Pulsing ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl border border-primary/30"
          />
        </motion.div>
      </div>

      {/* ── Success message ── */}
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your account has been created successfully.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A verification email has been sent to{" "}
          <span className="font-semibold text-foreground">{user?.email}</span>.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please verify your email before logging in.
        </p>
      </div>

      {/* ── Auto-check indicator ── */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="h-3.5 w-3.5" />
        </motion.div>
        <span>Checking automatically every few seconds…</span>
      </div>

      {/* ── Actions ── */}
      <div className="space-y-3">
        {/* Open Gmail */}
        <button
          type="button"
          onClick={openGmail}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open Gmail
        </button>

        {/* Spam / inbox notice */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Check your inbox or spam folder.
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Refresh verification status */}
        <button
          type="button"
          onClick={handleCheckNow}
          disabled={isChecking}
          className="w-full py-2.5 px-4 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Refresh Verification Status</>
          )}
        </button>

        {/* Resend verification email */}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
          className="w-full py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isResending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          ) : cooldown > 0 ? (
            <><Clock className="h-4 w-4" /> Resend in {cooldown}s</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Resend Verification Email</>
          )}
        </button>

        {/* Inbox tips */}
        <div className="p-3 rounded-xl bg-secondary/50 border border-border">
          <p className="text-xs font-semibold text-foreground mb-1.5">Didn&apos;t receive it?</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Check your spam / junk folder</li>
            <li>Make sure you used the correct email address</li>
            <li>Try the resend button above (max once per 60 seconds)</li>
          </ul>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out and use a different account
        </button>
      </div>
    </motion.div>
  );
}

export default EmailVerificationGate;
