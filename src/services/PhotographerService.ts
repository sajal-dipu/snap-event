import { db } from "@/lib/firebase/firestore";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  writeBatch,
  increment,
  deleteDoc,
} from "firebase/firestore";
import { PhotographerSchema, PhotographerSignupSchema, type ValidatedPhotographer } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type {
  Photographer,
  PhotographerFilters,
  PaginatedResponse,
  RatingStats,
} from "@/types";

export class PhotographerService {
  private readonly collection = "photographers";

  /**
   * Creates or updates a photographer's complete profile.
   */
  public async upsertProfile(id: string, data: ValidatedPhotographer): Promise<void> {
    try {
      const parsed = PhotographerSchema.parse(data);
      logger.info(`Upserting photographer profile: ${id}`);

      const docRef = doc(db, this.collection, id);
      await setDoc(
        docRef,
        {
          ...parsed,
          verificationStatus: "unverified",
          isActive: true,
          isFeatured: false,
          isSuspended: false,
          ratingStats: { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
          totalBookings: 0,
          completedBookings: 0,
          totalRooms: 0,
          totalPhotosUploaded: 0,
          availability: [],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Failed to upsert photographer ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Safely updates a photographer's profile fields using merge.
   */
  public async updateProfile(id: string, data: Record<string, any>): Promise<void> {
    try {
      logger.info(`Updating photographer profile fields: ${id}`);
      const docRef = doc(db, this.collection, id);
      await setDoc(
        docRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Failed to update photographer profile ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Creates a photographer document during initial signup.
   * Uses a relaxed schema — bio and pricing packages not required at signup.
   */
  public async createFromSignup(uid: string, data: unknown): Promise<void> {
    try {
      logger.info(`[Firestore] Validating signup data for photographer: ${uid}`);
      const parsed = PhotographerSignupSchema.parse(data);
      logger.info(`[Firestore] Creating photographer document in Firestore: ${uid}`, {
        uid: parsed.uid,
        email: parsed.email,
        name: parsed.name,
        phone: parsed.phone,
        role: parsed.role,
        blocked: parsed.blocked ?? false,
        isVerified: parsed.isVerified ?? false,
        status: parsed.status ?? "active",
        profileCompleted: parsed.profileCompleted ?? true,
        onboardingCompleted: parsed.onboardingCompleted ?? true,
        profilePhoto: parsed.profilePhoto ?? "",
        coverPhoto: parsed.coverPhoto ?? "",
        studioName: parsed.studioName ?? "",
        rating: parsed.rating ?? 0,
        ratingCount: parsed.ratingCount ?? 0,
      });

      const docRef = doc(db, this.collection, uid);
      await setDoc(docRef, {
        ...parsed,
        verificationStatus: "unverified",
        ratingStats: { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
        totalBookings: 0,
        completedBookings: 0,
        totalRooms: 0,
        totalPhotosUploaded: 0,
        availability: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        blocked: parsed.blocked ?? false,
        isVerified: parsed.isVerified ?? false,
        status: parsed.status ?? "active",
        profileCompleted: parsed.profileCompleted ?? true,
        onboardingCompleted: parsed.onboardingCompleted ?? true,
        profilePhoto: parsed.profilePhoto ?? "",
        coverPhoto: parsed.coverPhoto ?? "",
        studioName: parsed.studioName ?? "",
        rating: parsed.rating ?? 0,
        ratingCount: parsed.ratingCount ?? 0,
      });
      logger.info(`[Firestore] Photographer document successfully created for uid: ${uid}`);
    } catch (error) {
      logger.error(`[Firestore] Failed to create photographer from signup: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single photographer by ID.
   */

  public async getById(id: string): Promise<Photographer | null> {
    try {
      const snapshot = await getDoc(doc(db, this.collection, id));
      if (!snapshot.exists()) return null;
      
      const photographer = this.mapDoc(snapshot);
      
      // Fetch portfolio subcollection
      const portfolioSnap = await getDocs(
        query(
          collection(db, this.collection, id, "portfolio"),
          orderBy("order", "asc")
        )
      );
      const portfolioImages = portfolioSnap.docs.map((d) => {
        const pData = d.data();
        return {
          id: d.id,
          publicId: pData.publicId,
          secureUrl: pData.imageUrl,
          thumbnailUrl: pData.thumbnailUrl,
          isFeatured: pData.isFeatured ?? false,
          uploadedAt: pData.uploadedAt,
          category: pData.category || "wedding"
        };
      });
      
      photographer.portfolioImages = portfolioImages as any;
      return photographer;
    } catch (error) {
      logger.error(`Failed to fetch photographer: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single photographer by Slug.
   */
  public async getBySlug(slug: string): Promise<Photographer | null> {
    try {
      const q = query(
        collection(db, this.collection),
        where("slug", "==", slug),
        where("isActive", "==", true),
        where("isSuspended", "==", false)
      );
      const snaps = await getDocs(q);
      if (snaps.empty) return null;
      
      const photographer = this.mapDoc(snaps.docs[0]);
      
      // Fetch portfolio subcollection
      const portfolioSnap = await getDocs(
        query(
          collection(db, this.collection, photographer.uid, "portfolio"),
          orderBy("order", "asc")
        )
      );
      const portfolioImages = portfolioSnap.docs.map((d) => {
        const pData = d.data();
        return {
          id: d.id,
          publicId: pData.publicId,
          secureUrl: pData.imageUrl,
          thumbnailUrl: pData.thumbnailUrl,
          isFeatured: pData.isFeatured ?? false,
          uploadedAt: pData.uploadedAt,
          category: pData.category || "wedding"
        };
      });
      
      photographer.portfolioImages = portfolioImages as any;
      return photographer;
    } catch (error) {
      logger.error(`Failed to fetch photographer by slug: ${slug}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List photographers with filters and pagination.
   */
  public async list(
    filters: PhotographerFilters = {},
    pageSize = 20,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<Photographer>> {
    try {
      const ref = collection(db, this.collection);
      const constraints: Parameters<typeof query>[1][] = [
        where("isActive", "==", true),
        where("isSuspended", "==", false),
      ];

      if (filters.city) constraints.push(where("address.city", "==", filters.city));
      if (filters.verificationStatus) constraints.push(where("verificationStatus", "==", filters.verificationStatus));
      if (filters.minRating) constraints.push(where("ratingStats.average", ">=", filters.minRating));

      // Sort
      switch (filters.sortBy) {
        case "price_asc":
          constraints.push(orderBy("startingPrice", "asc"));
          break;
        case "price_desc":
          constraints.push(orderBy("startingPrice", "desc"));
          break;
        case "newest":
          constraints.push(orderBy("createdAt", "desc"));
          break;
        case "bookings":
          constraints.push(orderBy("completedBookings", "desc"));
          break;
        default:
          constraints.push(orderBy("ratingStats.average", "desc"));
      }

      constraints.push(limit(pageSize + 1));
      if (lastDocSnapshot) constraints.push(startAfter(lastDocSnapshot));

      const q = query(ref, ...constraints);
      const snaps = await getDocs(q);

      const hasMore = snaps.docs.length > pageSize;
      const docs = hasMore ? snaps.docs.slice(0, pageSize) : snaps.docs;

      return {
        data: docs.map((d) => this.mapDoc(d)),
        total: docs.length,
        hasMore,
      };
    } catch (error) {
      logger.error("Failed to list photographers:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get featured photographers for the landing page.
   */
  public async getFeatured(count = 6): Promise<Photographer[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where("isFeatured", "==", true),
        where("isActive", "==", true),
        orderBy("ratingStats.average", "desc"),
        limit(count)
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error("Failed to fetch featured photographers:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update aggregate rating stats after a new review.
   * Called from ReviewService after saving a review.
   */
  public async updateRatingStats(
    photographerId: string,
    newRating: number
  ): Promise<void> {
    try {
      const ref = doc(db, this.collection, photographerId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("Photographer not found");

      const existing: RatingStats = snap.data().ratingStats ?? {
        average: 0,
        count: 0,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      };

      const newCount = existing.count + 1;
      const newAverage =
        (existing.average * existing.count + newRating) / newCount;

      const updatedDistribution = { ...existing.distribution };
      const key = String(newRating) as keyof typeof updatedDistribution;
      updatedDistribution[key] = (updatedDistribution[key] ?? 0) + 1;

      await updateDoc(ref, {
        "ratingStats.average": parseFloat(newAverage.toFixed(2)),
        "ratingStats.count": newCount,
        [`ratingStats.distribution.${newRating}`]: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update rating stats for: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Increment total bookings counter (denormalized).
   */
  public async incrementBookingCount(
    photographerId: string,
    field: "totalBookings" | "completedBookings"
  ): Promise<void> {
    try {
      const ref = doc(db, this.collection, photographerId);
      await updateDoc(ref, {
        [field]: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to increment ${field} for: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Suspend or reactivate a photographer (admin only).
   */
  public async setSuspension(
    photographerId: string,
    isSuspended: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const ref = doc(db, this.collection, photographerId);
      await updateDoc(ref, {
        isSuspended,
        suspensionReason: reason ?? null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update suspension for: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Verify a photographer (admin only).
   */
  public async verify(photographerId: string, adminId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const ref = doc(db, this.collection, photographerId);
      batch.update(ref, {
        verificationStatus: "verified",
        verifiedAt: serverTimestamp(),
        verifiedBy: adminId,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      logger.error(`Failed to verify photographer: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: List all photographers (including inactive/suspended ones).
   */
  public async listAllForAdmin(): Promise<Photographer[]> {
    try {
      logger.info("Listing all photographers for admin overview");
      const snap = await getDocs(
        query(collection(db, this.collection), orderBy("createdAt", "desc"))
      );
      return snap.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error("Failed to list photographers for admin", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: Permanently delete a photographer document.
   */
  public async deletePhotographer(photographerId: string): Promise<void> {
    try {
      logger.info(`Permanently deleting photographer document: ${photographerId}`);
      await deleteDoc(doc(db, this.collection, photographerId));
    } catch (error) {
      logger.error(`Failed to delete photographer ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): Photographer {
    const data = (snap as QueryDocumentSnapshot<DocumentData>).data();
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      role: "photographer",
      name: data.name,
      studioName: data.studioName,
      slug: data.slug,
      marketplacePublished: data.marketplacePublished ?? false,
      isPublished: data.isPublished ?? data.marketplacePublished ?? false,
      specializations: data.specializations ?? data.specialties ?? [],
      portfolio: data.portfolio ?? [],
      packages: data.packages ?? data.pricingPackages ?? [],
      location: data.location ?? "",
      whatsappNumber: data.whatsappNumber ?? "",
      contactEmail: data.contactEmail ?? "",
      businessName: data.businessName,
      tagline: data.tagline,
      bio: data.bio,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      address: data.address,
      profileImage: data.profileImage,
      coverImage: data.coverImage,
      logo: data.logo,
      portfolioImages: data.portfolioImages ?? [],
      specialties: data.specialties ?? [],
      experience: data.experience ?? 0,
      languages: data.languages ?? [],
      equipment: data.equipment ?? [],
      photographyStyle: data.photographyStyle,
      pricingPackages: data.pricingPackages ?? [],
      startingPrice: data.startingPrice ?? 0,
      currency: data.currency ?? "INR",
      availability: data.availability ?? [],
      weeklySchedule: data.weeklySchedule,
      vacationMode: data.vacationMode ?? false,
      unavailableDates: data.unavailableDates ?? [],
      timezone: data.timezone ?? "Asia/Kolkata",
      socialLinks: data.socialLinks ?? {},
      ratingStats: data.ratingStats ?? { average: 0, count: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
      totalBookings: data.totalBookings ?? 0,
      completedBookings: data.completedBookings ?? 0,
      totalRooms: data.totalRooms ?? 0,
      totalPhotosUploaded: data.totalPhotosUploaded ?? 0,
      verificationStatus: data.verificationStatus ?? "unverified",
      verifiedAt: data.verifiedAt,
      verifiedBy: data.verifiedBy,
      profileCompletion: data.profileCompletion ?? 0,
      blocked: data.blocked ?? false,
      isVerified: data.isVerified ?? false,
      status: data.status ?? "active",
      profileCompleted: data.profileCompleted ?? true,
      onboardingCompleted: data.onboardingCompleted ?? true,
      profilePhoto: data.profilePhoto ?? "",
      coverPhoto: data.coverPhoto ?? "",
      rating: data.rating ?? 0,
      ratingCount: data.ratingCount ?? 0,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
      isSuspended: data.isSuspended ?? false,
      suspensionReason: data.suspensionReason,
      fcmToken: data.fcmToken,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const photographerService = new PhotographerService();
export default photographerService;
