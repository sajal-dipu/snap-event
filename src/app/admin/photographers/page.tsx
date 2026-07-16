"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { photographerService } from "@/services/PhotographerService";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Users, ShieldCheck, ShieldAlert, Ban, UserCheck, Trash2, Camera, Mail, Award, Calendar } from "lucide-react";
import type { Photographer } from "@/types";

export default function AdminPhotographersPage() {
  const [photographers, setPhotographers] = React.useState<Photographer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadPhotographers = React.useCallback(async () => {
    try {
      const list = await photographerService.listAllForAdmin();
      setPhotographers(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load photographer listings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPhotographers();
  }, [loadPhotographers]);

  const handleVerify = async (photographerId: string) => {
    setIsSubmitting(true);
    try {
      // Mock admin UID for tracking approvals
      await photographerService.verify(photographerId, "admin_super");
      toast.success("Photographer approved and verified successfully!");
      loadPhotographers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify photographer profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspension = async (photographerId: string, currentSuspended: boolean) => {
    setIsSubmitting(true);
    try {
      await photographerService.setSuspension(
        photographerId,
        !currentSuspended,
        currentSuspended ? undefined : "Suspended by administrative security command"
      );
      toast.success(currentSuspended ? "Photographer profile reactivated" : "Photographer suspended");
      loadPhotographers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update suspension state");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (photographerId: string) => {
    if (!confirm("Are you sure you want to permanently delete this photographer record? This cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await photographerService.deletePhotographer(photographerId);
      toast.success("Photographer record deleted from system.");
      loadPhotographers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete photographer profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Gathering photographer rosters...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 select-none">
        
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Camera className="h-7 w-7 text-primary" />
            Vetted Photographers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review submissions, approve badges, trigger photographer suspensions, or purge accounts.
          </p>
        </div>

        {/* List Table */}
        {photographers.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/20 py-24 text-center max-w-md mx-auto">
            <CardContent className="space-y-3">
              <Camera className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <h4 className="font-extrabold text-sm text-foreground">No photographers registered</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Once photographers complete their registration, their profile requests will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Photographer Info</th>
                    <th className="p-4">Studio / Specialties</th>
                    <th className="p-4">Performance metrics</th>
                    <th className="p-4">Trust Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {photographers.map((p) => {
                    const isVerified = p.verificationStatus === "verified";
                    return (
                      <tr key={p.uid} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        {/* 1. Name / Details */}
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                              {p.profileImage ? (
                                <img src={p.profileImage?.secureUrl || p.profileImage?.url} alt={p.name} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                              ) : (
                                <Camera className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{p.name || "No name"}</p>
                              <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {p.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Specialties */}
                        <td className="p-4 space-y-1 font-semibold">
                          <p className="text-foreground">{p.studioName || "Freelance"}</p>
                          <div className="flex flex-wrap gap-1">
                            {p.specialties.slice(0, 2).map((s) => (
                              <span key={s} className="px-1.5 py-0.5 bg-secondary text-[8px] font-black uppercase text-zinc-500 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 3. Performance Metrics */}
                        <td className="p-4 space-y-1 font-semibold text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={Math.round(p.ratingStats?.average || 0)} size="sm" />
                            <span className="text-[10px] font-mono text-foreground font-black">
                              {p.ratingStats?.average || "0.0"} ({p.ratingStats?.count || 0})
                            </span>
                          </div>
                          <div className="flex gap-3 text-[10px] font-bold">
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> {p.totalRooms || 0} rooms
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Award className="h-3.5 w-3.5 text-zinc-400" /> {p.completedBookings || 0} bookings
                            </span>
                          </div>
                        </td>

                        {/* 4. Trust Status */}
                        <td className="p-4 space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {/* Verification status */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              isVerified
                                ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                            }`}>
                              {p.verificationStatus}
                            </span>

                            {/* Suspension status */}
                            {p.isSuspended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                Suspended
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Actions */}
                        <td className="p-4 text-right space-x-1 shrink-0 whitespace-nowrap">
                          {!isVerified && (
                            <Button
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => handleVerify(p.uid)}
                              className="h-8 px-3 rounded-lg text-[10px] font-black bg-primary text-primary-foreground gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleToggleSuspension(p.uid, p.isSuspended)}
                            className={`h-8 w-8 rounded-lg ${
                              p.isSuspended
                                ? "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            }`}
                            title={p.isSuspended ? "Reactivate Photographer" : "Suspend Photographer"}
                          >
                            {p.isSuspended ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleDelete(p.uid)}
                            className="h-8 w-8 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/10"
                            title="Delete Photographer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block sm:hidden divide-y divide-border">
              {photographers.map((p) => {
                const isVerified = p.verificationStatus === "verified";
                return (
                  <div key={p.uid} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {p.profileImage ? (
                          <img
                            src={p.profileImage?.secureUrl || p.profileImage?.url}
                            alt={p.name}
                            className="w-full h-full object-cover rounded-xl"
                            loading="lazy"
                          />
                        ) : (
                          <Camera className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-foreground text-sm truncate">{p.name || "No name"}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {p.email}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          isVerified
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                        }`}>
                          {p.verificationStatus}
                        </span>
                        {p.isSuspended && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 p-3 rounded-2xl border border-border">
                      <div className="space-y-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Studio / Specialties</span>
                        <p className="text-foreground font-semibold text-xs truncate">{p.studioName || "Freelance"}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {p.specialties.slice(0, 2).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-secondary text-[8px] font-black uppercase text-zinc-500 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 text-right">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Performance</span>
                        <div className="flex items-center justify-end gap-1">
                          <StarRating rating={Math.round(p.ratingStats?.average || 0)} size="sm" />
                          <span className="text-[10px] font-mono text-foreground font-black">
                            {p.ratingStats?.average || "0.0"}
                          </span>
                        </div>
                        <div className="flex justify-end gap-2 text-[10px] text-muted-foreground font-bold mt-1">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="h-3 w-3 text-zinc-400" /> {p.totalRooms || 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Award className="h-3 w-3 text-zinc-400" /> {p.completedBookings || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      {!isVerified && (
                        <Button
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleVerify(p.uid)}
                          className="h-8 px-3 rounded-lg text-xs font-black bg-primary text-primary-foreground gap-1.5 flex items-center"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Approve
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleToggleSuspension(p.uid, p.isSuspended)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 border-border ${
                          p.isSuspended
                            ? "text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                        }`}
                      >
                        {p.isSuspended ? (
                          <><UserCheck className="h-3.5 w-3.5" /> Reactivate</>
                        ) : (
                          <><Ban className="h-3.5 w-3.5" /> Suspend</>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleDelete(p.uid)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-red-500 hover:text-red-650 hover:bg-red-500/10 border-border flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AdminDashboardLayout>
  );
}
