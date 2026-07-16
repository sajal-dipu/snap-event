"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function calculateCompletion(photographer: any) {
  if (!photographer) return 0;
  let score = 0;

  // Profile Photo = 10%
  if (photographer.profileImage?.secureUrl || photographer.profilePhoto) {
    score += 10;
  }

  // Cover = 10%
  if (photographer.coverImage?.secureUrl || photographer.coverPhoto) {
    score += 10;
  }

  // Bio = 10%
  if (photographer.bio && photographer.bio.trim().length > 0) {
    score += 10;
  }

  // Portfolio = 20%
  const hasPortfolioImages = photographer.portfolioImages && photographer.portfolioImages.length > 0;
  const hasPortfolioArray = photographer.portfolio && photographer.portfolio.length > 0;
  if (hasPortfolioImages || hasPortfolioArray) {
    score += 20;
  }

  // Packages = 20%
  const hasPricingPackages = photographer.pricingPackages && photographer.pricingPackages.length > 0;
  const hasPackagesArray = photographer.packages && photographer.packages.length > 0;
  if (hasPricingPackages || hasPackagesArray) {
    score += 20;
  }

  // Availability = 10%
  const hasAvailability = photographer.availability && (
    (Array.isArray(photographer.availability) && photographer.availability.length > 0) ||
    (!Array.isArray(photographer.availability) && Object.keys(photographer.availability).length > 0)
  );
  const hasUnavailableDates = photographer.unavailableDates && photographer.unavailableDates.length > 0;
  if (hasAvailability || hasUnavailableDates) {
    score += 10;
  }

  // Contact = 10%
  const hasContactInfo = photographer.phone || photographer.email || photographer.contactEmail || photographer.whatsappNumber;
  if (hasContactInfo) {
    score += 10;
  }

  // Reviews = 10%
  const hasReviewsCount = photographer.ratingStats?.count > 0;
  const hasReviewsArray = photographer.reviews && photographer.reviews.length > 0;
  if (hasReviewsCount || hasReviewsArray) {
    score += 10;
  }

  return score;
}

interface CompletionProgressProps {
  percentage: number;
}

export function CompletionProgress({ percentage }: CompletionProgressProps) {
  const isComplete = percentage === 100;
  const getProgressColor = () => {
    if (percentage < 40) return "bg-red-500 shadow-red-500/20";
    if (percentage < 80) return "bg-amber-500 shadow-amber-500/20";
    return "bg-green-500 shadow-green-500/20";
  };

  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-foreground">Profile Completion</h3>
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {isComplete
              ? "Your profile is fully completed and ready for the marketplace!"
              : "Complete your profile to look professional and rank higher in search results."}
          </p>
        </div>

        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="font-bold text-xl text-foreground whitespace-nowrap">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}
export default CompletionProgress;
