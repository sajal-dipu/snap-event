"use client";

import React, { useState, useEffect } from "react";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { photographerService } from "@/services/PhotographerService";
import { ProfileForm } from "@/features/photographers/components/ProfileForm";
import { CompletionProgress, calculateCompletion } from "@/features/photographers/components/CompletionProgress";
import { Loader2, MailCheck, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const { user, emailVerified } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const data = await photographerService.getById(user.uid);
      setProfileData(data);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.uid]);

  const handleProfileUpdated = (newData: any) => {
    setProfileData(newData);
  };

  if (loading || !user) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Loading your profile details...</p>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  const completionPercentage = profileData ? calculateCompletion(profileData) : 0;
  const isApproved = profileData?.verificationStatus === "verified";
  const isPending = profileData?.verificationStatus === "pending";

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Photographer Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your branding, pricing, portfolio, and schedules shown on the marketplace.</p>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {/* Email Verified Badge */}
            {emailVerified ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                <MailCheck className="h-4 w-4" /> Email Verified
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm animate-pulse">
                <AlertTriangle className="h-4 w-4" /> Verify Email
              </div>
            )}

            {/* Verification Status Badge */}
            {isApproved ? (
              <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                <ShieldCheck className="h-4 w-4" /> Profile Approved
              </div>
            ) : isPending ? (
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Approval Pending
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-muted border border-border text-muted-foreground px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                <UserCheck className="h-4 w-4" /> Unapproved Draft
              </div>
            )}
          </div>
        </div>

        {/* Completion Progress Bar */}
        <CompletionProgress percentage={completionPercentage} />

        {/* Profile Edit Form */}
        {profileData && (
          <ProfileForm
            initialData={profileData}
            uid={user.uid}
            onProfileUpdated={handleProfileUpdated}
          />
        )}
      </div>
    </PhotographerDashboardLayout>
  );
}
