"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Shield, Mail, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { AdminLoginSchema, type AdminLoginFormData } from "@/lib/validation/authSchemas";
import { signInWithEmail, setRoleCookie } from "@/lib/firebase/authService";
import { authService } from "@/services/AuthService";
import { useAuthStore } from "@/store/auth-store";

export function AdminLoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(AdminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsSubmitting(true);
    setAccessDenied(false);

    try {
      const credential = await signInWithEmail(data.email, data.password, false);
      const firebaseUser = credential.user;

      // Resolve role — must be admin
      const role = await authService.resolveUserRole(firebaseUser.uid);

      if (role !== "admin") {
        // Not an admin — deny access and sign out
        const { firebaseSignOut } = await import("@/lib/firebase/authService");
        await firebaseSignOut();
        setAccessDenied(true);
        setIsSubmitting(false);
        return;
      }

      // Set auth state
      setAuth({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        role: "admin",
        emailVerified: firebaseUser.emailVerified,
      });

      setRoleCookie("admin");
      toast.success("Welcome to the Admin Console.");
      router.push("/admin/dashboard");
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
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <Shield className="h-3.5 w-3.5" />
          Admin Console Access
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Sign In
        </h1>
        <p className="text-sm text-muted-foreground">
          This portal is restricted to SnapEvent administrators only.
        </p>
      </div>

      {/* Access Denied Banner */}
      <AnimatePresence>
        {accessDenied && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Access Denied</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                This account does not have administrator privileges. If you&apos;re a photographer, please use the{" "}
                <a href="/login" className="underline hover:text-red-300 transition-colors">
                  photographer login
                </a>{" "}
                page.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
            Admin Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              placeholder="admin@snapevent.com"
              {...register("email")}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all ${
                errors.email ? "border-red-500/60" : "border-border"
              }`}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-red-400">{errors.email.message}</motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter admin password"
              {...register("password")}
              className={`w-full pl-10 pr-11 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all ${
                errors.password ? "border-red-500/60" : "border-border"
              }`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-red-400">{errors.password.message}</motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-amber-500 text-zinc-900 text-sm font-bold hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating...</>
          ) : (
            <><Shield className="h-4 w-4" /> Access Admin Console</>
          )}
        </button>
      </form>

      {/* Security notice */}
      <p className="text-center text-xs text-muted-foreground/60">
        All admin actions are logged and audited.
      </p>
    </motion.div>
  );
}

export default AdminLoginForm;
