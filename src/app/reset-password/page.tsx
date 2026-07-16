"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, KeyRound, AlertTriangle } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [email, setEmail] = useState("");

  // Verify the reset code on mount
  useEffect(() => {
    if (!oobCode || mode !== "resetPassword") {
      setCodeError("This link is invalid or has expired. Please request a new reset link.");
      setIsVerifying(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setIsVerifying(false);
      })
      .catch(() => {
        setCodeError("This reset link has expired or already been used. Please request a new one.");
        setIsVerifying(false);
      });
  }, [oobCode, mode]);

  const validate = () => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
    if (!/[0-9]/.test(password)) return "Password must include a number";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a special character";
    if (password !== confirmPassword) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!oobCode) return;

    setIsSubmitting(true);
    setError("");

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setIsSuccess(true);
    } catch {
      setError("Failed to reset password. The link may have expired. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (codeError) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">{codeError}</p>
        </div>
        <Link href="/forgot-password"
          className="block w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold text-center hover:bg-primary/90 transition-all">
          Request New Reset Link
        </Link>
      </motion.div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }} className="space-y-6 text-center">
        <div className="flex justify-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
            className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </motion.div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Password Reset!</h2>
          <p className="text-sm text-muted-foreground">Your password has been updated successfully.</p>
        </div>
        <Link href="/login"
          className="block w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold text-center hover:bg-primary/90 transition-all">
          Sign In with New Password
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }} className="space-y-7">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
          <KeyRound className="h-3.5 w-3.5" /> Reset Password
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create new password</h1>
        {email && <p className="text-sm text-muted-foreground">For account: <span className="text-foreground font-medium">{email}</span></p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="rp-password" className="text-sm font-medium text-foreground">New Password</label>
          <div className="relative">
            <input id="rp-password" type={showPassword ? "text" : "password"}
              value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Min. 8 chars, uppercase, number, symbol" autoComplete="new-password"
              className="w-full px-3 pr-11 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="rp-confirm" className="text-sm font-medium text-foreground">Confirm New Password</label>
          <div className="relative">
            <input id="rp-confirm" type={showConfirm ? "text" : "password"}
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              placeholder="Re-enter your new password" autoComplete="new-password"
              className="w-full px-3 pr-11 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400">{error}</motion.p>
        )}
        <button type="submit" disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
        </button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}
