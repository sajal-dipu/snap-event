import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In | SnapEvent",
  description: "Sign in to your SnapEvent customer or photographer account.",
};

export default function AuthLoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
