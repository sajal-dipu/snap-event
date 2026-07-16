import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In | SnapEvent",
  description: "Sign in to your SnapEvent photographer account and access your dashboard.",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
