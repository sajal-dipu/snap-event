import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  deleteDoc,
} from "firebase/firestore";
import { ReviewSchema, type ValidatedReview } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import { photographerService } from "./PhotographerService";
import { bookingService } from "./BookingService";
import type { Review, PaginatedResponse } from "@/types";

export class ReviewService {
  private readonly collection = "reviews";

  /**
   * Submit a new review.
   * Automatically updates photographer rating stats and marks booking as reviewed.
   */
  public async create(data: ValidatedReview): Promise<string> {
    try {
      const parsed = ReviewSchema.parse(data);
      logger.info(`Creating review for photographer: ${parsed.photographerId}`);

      // Check for duplicate review on this booking
      const existing = await getDocs(
        query(
          collection(db, this.collection),
          where("bookingId", "==", parsed.bookingId),
          where("customerId", "==", parsed.customerId),
          limit(1)
        )
      );
      if (!existing.empty) {
        throw new Error("A review already exists for this booking.");
      }

      const docRef = await addDoc(collection(db, this.collection), {
        ...parsed,
        isVerified: false,
        isHidden: false,
        reportCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update photographer's aggregated rating stats
      await photographerService.updateRatingStats(parsed.photographerId, parsed.rating);

      // Mark booking as reviewed (prevents duplicate submissions)
      await bookingService.markReviewed(parsed.bookingId);

      return docRef.id;
    } catch (error) {
      logger.error("Failed to create review:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single review.
   */
  public async getById(id: string): Promise<Review | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, id));
      if (!snap.exists()) return null;
      return this.mapDoc(snap);
    } catch (error) {
      logger.error(`Failed to fetch review: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List public reviews for a photographer (paginated).
   */
  public async listByPhotographer(
    photographerId: string,
    pageSize = 20,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<Review>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("photographerId", "==", photographerId),
        where("isHidden", "==", false),
        orderBy("createdAt", "desc"),
        limit(pageSize + 1),
      ];
      if (lastDocSnapshot) constraints.push(startAfter(lastDocSnapshot));

      const snaps = await getDocs(query(collection(db, this.collection), ...constraints));
      const hasMore = snaps.docs.length > pageSize;
      const docs = hasMore ? snaps.docs.slice(0, pageSize) : snaps.docs;

      return {
        data: docs.map((d) => this.mapDoc(d)),
        total: docs.length,
        hasMore,
      };
    } catch (error) {
      logger.error(`Failed to list reviews for photographer: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all reviews submitted by a customer.
   */
  public async listByCustomer(customerId: string): Promise<Review[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error(`Failed to list reviews for customer: ${customerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Photographer adds a reply to a review.
   */
  public async addReply(reviewId: string, reply: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, reviewId), {
        reply,
        repliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to add reply to review: ${reviewId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: hide or show a review.
   */
  public async setVisibility(
    reviewId: string,
    isHidden: boolean,
    reason?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, reviewId), {
        isHidden,
        hiddenReason: reason ?? null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update visibility for review: ${reviewId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: verify a review as authentic.
   */
  public async verify(reviewId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, reviewId), {
        isVerified: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to verify review: ${reviewId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Report a review (increment abuse counter).
   */
  public async report(reviewId: string): Promise<void> {
    try {
      const ref = doc(db, this.collection, reviewId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Review not found");

      const currentCount = snap.data().reportCount ?? 0;
      await updateDoc(ref, {
        reportCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to report review: ${reviewId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: List all reviews (hidden and public) sorted by creation date.
   */
  public async listAllForAdmin(): Promise<Review[]> {
    try {
      logger.info("Listing all reviews for admin moderation");
      const snap = await getDocs(
        query(collection(db, this.collection), orderBy("createdAt", "desc"))
      );
      return snap.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error("Failed to list reviews for admin", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: Permanently delete a review.
   */
  public async deleteReview(reviewId: string): Promise<void> {
    try {
      logger.info(`Permanently deleting review: ${reviewId}`);
      await deleteDoc(doc(db, this.collection, reviewId));
    } catch (error) {
      logger.error(`Failed to delete review: ${reviewId}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): Review {
    const d = snap.data();
    return {
      id: snap.id,
      bookingId: d.bookingId,
      photographerId: d.photographerId,
      customerId: d.customerId,
      customerName: d.customerName,
      customerPhotoURL: d.customerPhotoURL,
      rating: d.rating,
      comment: d.comment,
      images: d.images,
      isVerified: d.isVerified ?? false,
      isHidden: d.isHidden ?? false,
      hiddenReason: d.hiddenReason,
      reportCount: d.reportCount ?? 0,
      reply: d.reply,
      repliedAt: d.repliedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const reviewService = new ReviewService();
export default reviewService;
