import { PublicLayout } from "@/components/layout/PublicLayout";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { SearchSection } from "@/features/landing/components/SearchSection";
import { TrustedSection } from "@/features/landing/components/TrustedSection";
import { CategorySection } from "@/features/landing/components/CategorySection";
import { PhotographerGrid } from "@/features/landing/components/PhotographerGrid";
import { FeaturesSection } from "@/features/landing/components/FeaturesSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection";
import { PortfolioSection } from "@/features/landing/components/PortfolioSection";
import { TestimonialsSection } from "@/features/landing/components/TestimonialsSection";
import { PricingSection } from "@/features/landing/components/PricingSection";
import { FAQSection } from "@/features/landing/components/FAQSection";
import { FinalCTA } from "@/features/landing/components/FinalCTA";

export default function Home() {
  return (
    <PublicLayout>
      <HeroSection />
      <SearchSection />
      <TrustedSection />
      <CategorySection />
      <PhotographerGrid />
      <FeaturesSection />
      <HowItWorksSection />
      <PortfolioSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
    </PublicLayout>
  );
}
