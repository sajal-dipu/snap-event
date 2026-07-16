"use client";

import { AuthLayout } from "@/components/layout/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { EmailVerificationGate } from "@/features/auth/components/EmailVerificationGate";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Already verified → go to onboarding (profile creation)
    if (isAuthenticated && user?.emailVerified) {
      console.log("[Authentication] User already verified, redirecting to /onboarding.");
      router.replace("/onboarding");
      return;
    }

    // Not logged in at all (no Firebase Auth session) → go to login
    // Note: we only redirect after loading is complete to avoid race conditions
    // right after signup when the auth store is still resolving.
    if (!isAuthenticated) {
      console.log("[Authentication] No authenticated user on /verify-email, redirecting to /login.");
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show spinner while auth state resolves
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AuthLayout>
      <EmailVerificationGate />
    </AuthLayout>
  );
}
