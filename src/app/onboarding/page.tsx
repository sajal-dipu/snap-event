import { AuthLayout } from "@/components/layout/AuthLayout";
import { OnboardingWizard } from "@/features/auth/components/OnboardingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Your Profile | SnapEvent",
  description:
    "Set up your photographer profile on SnapEvent. Add your studio details, specialties, pricing, and portfolio photos.",
};

export default function OnboardingPage() {
  return (
    <AuthLayout>
      <OnboardingWizard />
    </AuthLayout>
  );
}
