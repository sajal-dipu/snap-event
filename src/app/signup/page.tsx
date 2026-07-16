"use client";

import React, { useState, Suspense } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SignUpWizard } from "@/features/auth/components/SignUpWizard";
import { CustomerSignUpForm } from "@/features/auth/components/CustomerSignUpForm";
import { Camera, User, Briefcase } from "lucide-react";

export default function SignUpPage() {
  const [role, setRole] = useState<"customer" | "photographer">("customer");

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 mb-2 lg:hidden">
            <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm">SnapEvent</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Join SnapEvent
          </h1>
          <p className="text-sm text-muted-foreground">
            Create an account to hire photographers or showcase your work
          </p>
        </div>

        {/* Role Switcher tabs */}
        <div className="flex border border-border bg-card p-1 rounded-xl gap-1">
          <button
            onClick={() => setRole("customer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              role === "customer"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" /> Client Sign Up
          </button>
          <button
            onClick={() => setRole("photographer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              role === "photographer"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" /> Photographer Sign Up
          </button>
        </div>

        {/* Dynamic Form render */}
        <Suspense fallback={null}>
          {role === "customer" ? <CustomerSignUpForm /> : <SignUpWizard />}
        </Suspense>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
