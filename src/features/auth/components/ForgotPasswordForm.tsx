"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle2, SendHorizonal } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";

import { ForgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validation/authSchemas";
import { sendPasswordReset, parseFirebaseAuthError } from "@/lib/firebase/authService";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    try {
      await sendPasswordReset(data.email);
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } catch (error) {
      const message = parseFirebaseAuthError(error);
      setError("email", { message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!submitted ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
          className="space-y-7"
        >
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Forgot your password?
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="fp-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                  {...register("email")}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
                    errors.email ? "border-red-500/60" : "border-border"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><SendHorizonal className="h-4 w-4" /> Send Reset Link</>
              )}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6 text-center"
        >
          {/* Success Icon */}
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
            >
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ve sent a password reset link to
            </p>
            <p className="text-sm font-semibold text-foreground">{submittedEmail}</p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-left space-y-2">
            <p className="text-xs font-semibold text-foreground">What to do next:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Click the reset link (valid for 1 hour)</li>
              <li>Create a new strong password</li>
              <li>Sign in to your account</li>
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder or{" "}
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-primary hover:text-primary/80 underline transition-colors"
            >
              try again
            </button>
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ForgotPasswordForm;
