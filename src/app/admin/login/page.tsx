import { AuthLayout } from "@/components/layout/AuthLayout";
import { AdminLoginForm } from "@/features/auth/components/AdminLoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Console | SnapEvent",
  description: "SnapEvent administrator access portal.",
};

export default function AdminLoginPage() {
  return (
    <AuthLayout>
      <AdminLoginForm />
    </AuthLayout>
  );
}
