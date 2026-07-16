import { AuthLayout } from "@/components/layout/AuthLayout";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | SnapEvent",
  description: "Reset your SnapEvent account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
