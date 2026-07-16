"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PhotographerDashboardLayout } from "@/components/layout/PhotographerDashboardLayout";
import { reviewService } from "@/services/ReviewService";
import { photographerService } from "@/services/PhotographerService";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { MessageSquare, Star, Reply, Calendar, Award, TrendingUp, Sparkles, User } from "lucide-react";
import type { Review, Photographer } from "@/types";

export default function PhotographerReviewsPage() {
  const { user } = useAuth();

  const [photographer, setPhotographer] = React.useState<Photographer | null>(null);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Reply state
  const [replyTextMap, setReplyTextMap] = React.useState<Record<string, string>>({});
  const [replyingReviewId, setReplyingReviewId] = React.useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {
      // 1. Load photographer rating stats
      const p = await photographerService.getById(user.uid);
      if (p) setPhotographer(p);

      // 2. Load reviews list
      const response = await reviewService.listByPhotographer(user.uid, 50);
      setReviews(response.data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
      toast.error("Failed to fetch reviews logs.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyTextMap[reviewId]?.trim();
    if (!text) {
      toast.error("Reply text cannot be empty.");
      return;
    }
    setIsSubmittingReply(true);
    try {
      await reviewService.addReply(reviewId, text);
      toast.success("Reply submitted successfully!");
      setReplyingReviewId(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplyTextChange = (reviewId: string, val: string) => {
    setReplyTextMap((prev) => ({ ...prev, [reviewId]: val }));
  };

  // Helper calculation for distribution bar percentage
  const getDistributionPct = (ratingCount: number): number => {
    if (!photographer || !photographer.ratingStats.count) return 0;
    return Math.round((ratingCount / photographer.ratingStats.count) * 100);
  };

  if (isLoading) {
    return (
      <PhotographerDashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Analyzing review database...</p>
        </div>
      </PhotographerDashboardLayout>
    );
  }

  // Fallback defaults for statistics
  const stats = photographer?.ratingStats || {
    average: 0,
    count: 0,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  };

  const dist = stats.distribution || { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

  return (
    <PhotographerDashboardLayout>
      <div className="space-y-8 select-none">
        {/* Header */}
        <div className="border-b border-border pb-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Client Reviews & Feedbacks
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor client feedback, view rating statistics breakdown, and respond to public testimonials.
          </p>
        </div>

        {/* Rating Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Average Rating */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Average Rating
              </CardTitle>
              <Award className="h-4.5 w-4.5 text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">{stats.average.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-bold">/ 5.0</span>
              </div>
              <StarRating rating={Math.round(stats.average)} size="md" />
              <p className="text-[10px] text-muted-foreground font-semibold">
                Calculated across {stats.count} verified booking review{stats.count !== 1 ? "s" : ""}.
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Rating Distribution */}
          <Card className="border border-border bg-card md:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Rating Breakdown
              </CardTitle>
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-2">
              {["5", "4", "3", "2", "1"].map((star) => {
                const count = (dist as any)[star] || 0;
                const pct = getDistributionPct(count);
                return (
                  <div key={star} className="flex items-center gap-3 text-xs font-bold">
                    <span className="w-3 text-right">{star}★</span>
                    <div className="flex-grow h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground text-[10px] font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="space-y-5">
          <h3 className="text-sm font-black uppercase text-muted-foreground tracking-wider">
            All Reviews ({reviews.length})
          </h3>

          {reviews.length === 0 ? (
            <Card className="border border-dashed border-border bg-card/20 py-20 text-center max-w-md mx-auto">
              <CardContent className="space-y-3">
                <Star className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <h4 className="font-extrabold text-sm">No reviews found yet</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Reviews are automatically enabled when you complete client booking requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reviews.map((review) => {
                const isReplying = replyingReviewId === review.id;
                const replyText = replyTextMap[review.id] || "";

                return (
                  <Card key={review.id} className="border border-border bg-card">
                    <CardContent className="p-5 space-y-4">
                      {/* Customer Info header */}
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-border flex items-center justify-center shrink-0">
                            {review.customerPhotoURL ? (
                              <img
                                src={review.customerPhotoURL}
                                alt={review.customerName}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              <User className="h-4.5 w-4.5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-foreground">{review.customerName}</h4>
                            <p className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : "Recently"}
                            </p>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex flex-col items-end gap-1">
                          <StarRating rating={review.rating} size="sm" />
                          {review.isVerified && (
                            <span className="text-[8px] font-black uppercase text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                              Verified Shoot
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-3">
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>

                        {/* Optional Attached Photos */}
                        {review.images && review.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {review.images.map((img, idx) => (
                              <a
                                key={idx}
                                href={img.secureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0 hover:opacity-85 transition-opacity"
                              >
                                <img src={img.secureUrl} alt="Review attachment" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Public Reply box if exists */}
                      {review.reply ? (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-border space-y-1">
                          <p className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Reply className="h-3 w-3 transform scale-x-[-1]" />
                            Your Response:
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {review.reply}
                          </p>
                        </div>
                      ) : (
                        <div className="pt-2 flex justify-end">
                          {!isReplying ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReplyingReviewId(review.id)}
                              className="h-8 text-[10px] font-black rounded-lg gap-1 border-zinc-200"
                            >
                              <Reply className="h-3 w-3" /> Reply public
                            </Button>
                          ) : (
                            <div className="w-full space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => handleReplyTextChange(review.id, e.target.value)}
                                placeholder="Write a response to thank your client or add details..."
                                className="w-full min-h-[60px] p-2 text-xs rounded-lg border border-border bg-transparent focus-visible:outline-none focus:border-primary text-foreground"
                              />
                              <div className="flex items-center justify-end gap-2 text-[10px]">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReplyingReviewId(null)}
                                  className="h-8 rounded-lg"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSubmittingReply}
                                  onClick={() => handleReplySubmit(review.id)}
                                  className="h-8 bg-primary text-primary-foreground font-black rounded-lg"
                                >
                                  {isSubmittingReply ? "Submitting..." : "Post Response"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PhotographerDashboardLayout>
  );
}
