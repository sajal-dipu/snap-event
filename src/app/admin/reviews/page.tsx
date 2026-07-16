"use client";

import * as React from "react";
import { AdminDashboardLayout } from "@/components/layout/AdminDashboardLayout";
import { reviewService } from "@/services/ReviewService";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { MessageSquare, Eye, EyeOff, Trash2, Calendar, User, UserCheck, ShieldAlert } from "lucide-react";
import type { Review } from "@/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadReviews = React.useCallback(async () => {
    try {
      const list = await reviewService.listAllForAdmin();
      setReviews(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reviews logs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleToggleVisibility = async (reviewId: string, currentHidden: boolean) => {
    setIsSubmitting(true);
    try {
      await reviewService.setVisibility(
        reviewId,
        !currentHidden,
        currentHidden ? undefined : "Flagged for administrative content guidelines violations"
      );
      toast.success(currentHidden ? "Review published successfully" : "Review hidden from public profiles");
      loadReviews();
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle review visibility");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review? This action cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await reviewService.deleteReview(reviewId);
      toast.success("Review permanently deleted.");
      loadReviews();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Retrieving review database...</p>
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
            <MessageSquare className="h-7 w-7 text-primary" />
            Reviews Moderation Gate
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit testimonials, flag abusive content, hide reviews, or delete duplicate feedback entries.
          </p>
        </div>

        {/* List Table */}
        {reviews.length === 0 ? (
          <Card className="border border-dashed border-border bg-card/20 py-24 text-center max-w-md mx-auto">
            <CardContent className="space-y-3">
              <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
              <h4 className="font-extrabold text-sm text-foreground">No reviews listed</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Customer-submitted reviews and photographer responses will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/80 text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="p-4">Customer Info</th>
                    <th className="p-4">Stars & Testimonial</th>
                    <th className="p-4">Event Booking ID</th>
                    <th className="p-4">Moderation Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => {
                    const dateStr = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "Just now";
                    return (
                      <tr key={r.id} className="border-b border-border hover:bg-secondary/40 transition-colors">
                        {/* 1. Customer Info */}
                        <td className="p-4 space-y-1">
                          <p className="font-bold text-foreground flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            {r.customerName}
                          </p>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold leading-none">
                            <Calendar className="h-3 w-3" />
                            {dateStr}
                          </p>
                        </td>

                        {/* 2. Rating / Comment */}
                        <td className="p-4 space-y-1 max-w-sm">
                          <StarRating rating={r.rating} size="sm" />
                          <p className="text-zinc-600 dark:text-zinc-300 italic line-clamp-3 leading-relaxed">
                            &ldquo;{r.comment}&rdquo;
                          </p>
                          {r.reply && (
                            <p className="text-[10px] text-zinc-400 font-bold border-l border-border pl-2 mt-1">
                              Response: &ldquo;{r.reply}&rdquo;
                            </p>
                          )}
                        </td>

                        {/* 3. Booking ID */}
                        <td className="p-4 font-mono text-zinc-500">
                          {r.bookingId}
                        </td>

                        {/* 4. Moderation Status */}
                        <td className="p-4 space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            r.isHidden
                              ? "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20"
                              : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                          }`}>
                            {r.isHidden ? "Hidden" : "Public"}
                          </span>
                          
                          {r.isHidden && r.hiddenReason && (
                            <p className="text-[9px] text-red-500/70 font-semibold max-w-xs">
                              Reason: {r.hiddenReason}
                            </p>
                          )}
                        </td>

                        {/* 5. Actions */}
                        <td className="p-4 text-right space-x-1 shrink-0 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleToggleVisibility(r.id, r.isHidden)}
                            className={`h-8 w-8 rounded-lg ${
                              r.isHidden ? "text-green-500 hover:text-green-600 hover:bg-green-500/10" : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            }`}
                            title={r.isHidden ? "Publish Review" : "Hide Review"}
                          >
                            {r.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting}
                            onClick={() => handleDeleteReview(r.id)}
                            className="h-8 w-8 rounded-lg text-red-500 hover:text-red-650 hover:bg-red-500/10"
                            title="Delete Review"
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
              {reviews.map((r) => {
                const dateStr = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : "Just now";
                return (
                  <div key={r.id} className="p-4 space-y-3 bg-card/50">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground flex items-center gap-1 text-sm">
                        <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        {r.customerName}
                      </p>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-2.5 text-xs">
                      <div>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Rating</span>
                        <StarRating rating={r.rating} size="sm" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Comment</span>
                        <p className="text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      </div>
                      {r.reply && (
                        <div>
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block mb-1">Response</span>
                          <p className="text-[10px] text-zinc-400 font-bold border-l border-border pl-2 leading-relaxed">
                            &ldquo;{r.reply}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5">
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase">Booking ID</p>
                        <p className="font-mono text-zinc-500 text-[10px] mt-0.5">{r.bookingId}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          r.isHidden
                            ? "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20"
                            : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                        }`}>
                          {r.isHidden ? "Hidden" : "Public"}
                        </span>
                        {r.isHidden && r.hiddenReason && (
                          <p className="text-[9px] text-red-500/70 font-semibold max-w-xs mt-0.5">
                            Reason: {r.hiddenReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleToggleVisibility(r.id, r.isHidden)}
                        className={`h-8 px-3 text-xs gap-1.5 flex-1 justify-center ${
                          r.isHidden ? "text-green-500 hover:text-green-600 border-green-500/20 hover:bg-green-500/10" : "text-amber-500 hover:text-amber-600 border-amber-500/20 hover:bg-amber-500/10"
                        }`}
                        title={r.isHidden ? "Publish Review" : "Hide Review"}
                      >
                        {r.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        {r.isHidden ? "Publish" : "Hide"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => handleDeleteReview(r.id)}
                        className="h-8 px-3 text-xs text-red-500 hover:text-red-650 border-red-500/20 hover:bg-red-500/10 gap-1.5 flex-1 justify-center"
                        title="Delete Review"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
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
