"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, MessageSquare, ShieldAlert, Sparkles, Image as ImageIcon, Trash2, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { bookingService } from "@/services/BookingService";
import { reviewService } from "@/services/ReviewService";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Booking } from "@/types";

// Validation schema using Zod
const reviewFormSchema = z.object({
  rating: z.number().int().min(1, "Please select a rating").max(5),
  comment: z.string().min(10, "Please describe your experience in at least 10 characters").max(1000, "Review cannot exceed 1000 characters"),
  isAnonymous: z.boolean(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

export default function SubmitReviewPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Future ready review images upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: "",
      isAnonymous: false,
    },
  });

  const ratingValue = watch("rating");

  // Load Booking Details
  useEffect(() => {
    async function loadBooking() {
      try {
        const b = await bookingService.getById(bookingId);
        if (!b) {
          toast.error("Booking record not found.");
          setIsLoadingBooking(false);
          return;
        }

        if (b.status !== "completed") {
          toast.error("Reviews can only be submitted for completed bookings.");
          setIsLoadingBooking(false);
          return;
        }

        if (b.hasReview) {
          toast.error("A review has already been submitted for this booking.");
          setSubmittedSuccess(true); // Already submitted
          setIsLoadingBooking(false);
          return;
        }

        setBooking(b);
      } catch (err) {
        console.error("Failed to load booking details:", err);
        toast.error("Failed to verify booking credentials.");
      } finally {
        setIsLoadingBooking(false);
      }
    }

    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  // Image Selection Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 5) {
        toast.error("You can upload a maximum of 5 review images.");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  // Remove Selected Image
  const handleRemoveImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Direct Cloudinary Upload for Review Images
  const uploadReviewImages = async (): Promise<any[]> => {
    if (selectedFiles.length === 0) return [];
    
    setIsUploadingImages(true);
    const assets: any[] = [];

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "snapevent_upload";

      if (!cloudName) {
        throw new Error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME env variable.");
      }

      for (const file of selectedFiles) {
        const folderPath = "snapevent/reviews";

        // 2. Upload to Cloudinary via FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", folderPath);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        const bodyText = await uploadRes.text();
        let cloudinaryData: any;
        try {
          cloudinaryData = JSON.parse(bodyText);
        } catch {
          console.error(`[Cloudinary Review] ❌ Failed to parse response JSON:`, bodyText);
          throw new Error(`Upload server returned unreadable response: ${bodyText}`);
        }

        if (!uploadRes.ok) {
          console.error(`[Cloudinary Review] ❌ Upload failed. Complete Response:`, JSON.stringify(cloudinaryData, null, 2));
          throw new Error(cloudinaryData?.error?.message || `Upload failed with status ${uploadRes.status}`);
        }

        assets.push({
          publicId: cloudinaryData.public_id,
          secureUrl: cloudinaryData.secure_url,
        });
      }
      return assets;
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      toast.error(`Failed to upload review images: ${err?.message || err}. Continuing without them.`);
      return [];
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Form Submission
  const onSubmit = async (data: ReviewFormData) => {
    if (!booking) return;
    setIsSubmitting(true);

    try {
      // 1. Upload images if any
      const uploaded = await uploadReviewImages();

      // 2. Submit Review
      const customerName = data.isAnonymous ? "Anonymous" : booking.customerName;
      const customerPhotoURL = data.isAnonymous ? "" : (booking.customerId.startsWith("guest_") ? "" : undefined);

      await reviewService.create({
        bookingId,
        photographerId: booking.photographerId,
        customerId: booking.customerId,
        customerName,
        customerPhotoURL,
        rating: data.rating,
        comment: data.comment,
        images: uploaded.length > 0 ? uploaded : undefined,
      });

      toast.success("Thank you! Your review has been submitted.");
      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error("Review submission failed:", err);
      toast.error(err?.message || "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBooking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold">Verifying booking security credentials...</p>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in duration-200">
          <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Review Submitted!</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your feedback is greatly appreciated and helps photographers on SnapEvent improve their services.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="w-full h-11 rounded-xl bg-primary gap-2">
            Return to Homepage <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-foreground">Access Denied</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This review link is invalid or the booking is not completed yet. You cannot submit feedback at this stage.
            </p>
          </div>
          <Button onClick={() => router.push("/")} className="w-full h-11 rounded-xl bg-primary">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950/40 text-foreground py-12 px-4 flex justify-center items-center">
      <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="space-y-1.5 border-b border-border pb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black text-primary uppercase tracking-wide">
            <Sparkles className="h-3 w-3" /> Booking Complete
          </div>
          <h1 className="text-2xl font-black tracking-tight">Share Your Experience</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submit a review for your shoot with <span className="font-bold text-foreground">{booking.photographerName}</span> on {booking.eventDate?.toDate ? new Date(booking.eventDate.toDate()).toLocaleDateString() : "your event date"}.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Star Rating Select */}
          <div className="space-y-2 text-center bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-border">
            <label className="block text-xs font-black uppercase text-muted-foreground tracking-wider mb-2">
              Select Your Rating
            </label>
            <div className="flex justify-center">
              <StarRating
                rating={ratingValue}
                interactive={true}
                size="lg"
                onChange={(val) => setValue("rating", val, { shouldValidate: true })}
              />
            </div>
            {errors.rating && (
              <p className="text-xs text-red-500 font-bold mt-2">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment / Review Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" /> Review Details
            </label>
            <textarea
              {...register("comment")}
              rows={5}
              placeholder="Tell us about the photographer's punctuality, skill, communication, and dynamic photo delivery. What went well? What could be improved?"
              className={`flex w-full rounded-xl border bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground focus:border-primary ${
                errors.comment ? "border-red-500" : "border-border"
              }`}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
              <span>Min 10 characters</span>
              {errors.comment && <span className="text-red-500 font-bold">{errors.comment.message}</span>}
            </div>
          </div>

          {/* Image Upload section (Future Ready) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" /> Review Photos (Optional)
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl border border-border overflow-hidden bg-zinc-100 dark:bg-zinc-900 group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Upload Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100 duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {selectedFiles.length < 5 && (
                <label className="aspect-square border border-dashed border-border hover:border-primary rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer bg-zinc-50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-all">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground">Add Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold">Upload up to 5 images showing the photographer at work or sample edits you loved.</p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-2.5 p-3.5 bg-zinc-50 dark:bg-zinc-900/40 border border-border rounded-xl">
            <input
              type="checkbox"
              id="isAnonymous"
              {...register("isAnonymous")}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-transparent cursor-pointer"
            />
            <div className="space-y-0.5 cursor-pointer">
              <label htmlFor="isAnonymous" className="text-xs font-black text-foreground block leading-none">
                Submit Anonymously
              </label>
              <span className="text-[10px] text-muted-foreground block font-semibold">
                Your name and avatar will be hidden on public reviews.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={isSubmitting}
              className="h-11 px-6 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploadingImages}
              className="h-11 px-8 text-xs font-black bg-primary text-primary-foreground rounded-xl gap-2 shadow-lg shadow-primary/10"
            >
              {isSubmitting || isUploadingImages ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploadingImages ? "Uploading Photos..." : "Submitting..."}
                </>
              ) : (
                <>
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
