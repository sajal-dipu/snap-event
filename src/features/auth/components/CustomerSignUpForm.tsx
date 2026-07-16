"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { signUpWithEmail, setRoleCookie } from "@/lib/firebase/authService";
import { useAuthStore } from "@/store/auth-store";

const CustomerSignUpSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid phone number with country code (e.g. +919876543210)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type CustomerSignUpData = z.infer<typeof CustomerSignUpSchema>;

export function CustomerSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/photographers";
  const { setAuth } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerSignUpData>({ resolver: zodResolver(CustomerSignUpSchema) });

  const onSubmit = async (data: CustomerSignUpData) => {
    setIsSubmitting(true);
    try {
      console.log(`[Authentication] Creating customer account for: ${data.email}`);
      const credential = await signUpWithEmail(data.email, data.password);
      const firebaseUser = credential.user;

      // Update Display Name in Auth Profile
      await updateProfile(firebaseUser, { displayName: data.fullName });

      // Create users/{uid} collection entry
      await setDoc(doc(db, "users", firebaseUser.uid), {
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        profilePhoto: "",
        createdAt: serverTimestamp(),
        bookingsCount: 0,
        favoritePhotographers: [],
        role: "user"
      });

      // Update local client authentication state
      setAuth({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: data.fullName,
        photoURL: "",
        role: "user",
        emailVerified: firebaseUser.emailVerified,
      });
      setRoleCookie("user");

      toast.success("Account created successfully! Welcome to SnapEvent.");
      router.push(fromPath);
    } catch (error: any) {
      console.error("[Authentication] Customer signup failed:", error);
      toast.error(error?.message || "Sign up failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="c-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="c-name"
              type="text"
              placeholder="e.g. John Doe"
              {...register("fullName")}
              className={inputCls(!!errors.fullName, "pl-10")}
            />
          </div>
          {errors.fullName && <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="c-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="c-email"
              type="email"
              placeholder="e.g. john@example.com"
              {...register("email")}
              className={inputCls(!!errors.email, "pl-10")}
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label htmlFor="c-phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="c-phone"
              type="tel"
              placeholder="e.g. +919876543210"
              {...register("phone")}
              className={inputCls(!!errors.phone, "pl-10")}
            />
          </div>
          {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="c-pw" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="c-pw"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              {...register("password")}
              className={inputCls(!!errors.password, "pl-10 pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="c-cpw" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="c-cpw"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password"
              {...register("confirmPassword")}
              className={inputCls(!!errors.confirmPassword, "pl-10 pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
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
    </motion.div>
  );
}

function inputCls(hasError: boolean, extra = "") {
  return `w-full px-3 py-2.5 rounded-lg bg-secondary border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${extra} ${
    hasError ? "border-red-500/60 focus:ring-red-500/30" : "border-border hover:border-primary/30"
  }`;
}

export default CustomerSignUpForm;
