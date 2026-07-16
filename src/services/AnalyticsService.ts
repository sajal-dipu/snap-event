import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type {
  PlatformDailyAnalytics,
  PhotographerMonthlyAnalytics,
  Analytics,
} from "@/types";

export class AnalyticsService {
  private readonly collection = "analytics";

  /**
   * Upsert platform daily analytics for a given date.
   * Called from Cloud Functions. Uses merge to accumulate within the day.
   */
  public async upsertPlatformDaily(
    date: string, // YYYY-MM-DD
    updates: Partial<Omit<PlatformDailyAnalytics, "id" | "type" | "date" | "createdAt">>
  ): Promise<void> {
    try {
      const docId = `platform_daily_${date}`;
      const ref = doc(db, this.collection, docId);

      await setDoc(
        ref,
        {
          id: docId,
          type: "platform_daily",
          date,
          ...updates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Failed to upsert platform daily analytics: ${date}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Upsert photographer monthly analytics.
   * Called from Cloud Functions. Uses merge to accumulate within the month.
   */
  public async upsertPhotographerMonthly(
    photographerId: string,
    month: string, // YYYY-MM
    updates: Partial<Omit<PhotographerMonthlyAnalytics, "id" | "type" | "photographerId" | "month" | "createdAt">>
  ): Promise<void> {
    try {
      const docId = `photographer_${photographerId}_monthly_${month}`;
      const ref = doc(db, this.collection, docId);

      await setDoc(
        ref,
        {
          id: docId,
          type: "photographer_monthly",
          photographerId,
          month,
          ...updates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Failed to upsert photographer monthly analytics: ${photographerId}/${month}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get platform daily analytics for a date range.
   */
  public async getPlatformRange(
    fromDate: string, // YYYY-MM-DD
    toDate: string,
    maxDays = 30
  ): Promise<PlatformDailyAnalytics[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where("type", "==", "platform_daily"),
        where("date", ">=", fromDate),
        where("date", "<=", toDate),
        orderBy("date", "desc"),
        limit(maxDays)
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => this.mapPlatformDoc(d));
    } catch (error) {
      logger.error(`Failed to get platform analytics range: ${fromDate} to ${toDate}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get photographer monthly analytics for N months.
   */
  public async getPhotographerHistory(
    photographerId: string,
    months = 6
  ): Promise<PhotographerMonthlyAnalytics[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where("type", "==", "photographer_monthly"),
        where("photographerId", "==", photographerId),
        orderBy("month", "desc"),
        limit(months)
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => this.mapPhotographerDoc(d));
    } catch (error) {
      logger.error(`Failed to get photographer analytics: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get a photographer's current month stats.
   */
  public async getPhotographerCurrentMonth(photographerId: string): Promise<PhotographerMonthlyAnalytics | null> {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const docId = `photographer_${photographerId}_monthly_${month}`;
      const snap = await getDoc(doc(db, this.collection, docId));
      if (!snap.exists()) return null;
      return this.mapPhotographerDoc(snap as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      logger.error(`Failed to get current month analytics: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get today's platform stats.
   */
  public async getTodayPlatform(): Promise<PlatformDailyAnalytics | null> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const snap = await getDoc(doc(db, this.collection, `platform_daily_${today}`));
      if (!snap.exists()) return null;
      return this.mapPlatformDoc(snap as QueryDocumentSnapshot<DocumentData>);
    } catch (error) {
      logger.error("Failed to get today platform analytics:", error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapPlatformDoc(snap: QueryDocumentSnapshot<DocumentData>): PlatformDailyAnalytics {
    const d = snap.data();
    return {
      id: snap.id,
      type: "platform_daily",
      date: d.date,
      newUsers: d.newUsers ?? 0,
      newPhotographers: d.newPhotographers ?? 0,
      activeUsers: d.activeUsers ?? 0,
      bookingsCreated: d.bookingsCreated ?? 0,
      bookingsCompleted: d.bookingsCompleted ?? 0,
      bookingsCancelled: d.bookingsCancelled ?? 0,
      revenueTotal: d.revenueTotal ?? 0,
      currency: d.currency ?? "INR",
      roomsCreated: d.roomsCreated ?? 0,
      photosUploaded: d.photosUploaded ?? 0,
      downloadRequestsCreated: d.downloadRequestsCreated ?? 0,
      downloadRequestsApproved: d.downloadRequestsApproved ?? 0,
      reviewsSubmitted: d.reviewsSubmitted ?? 0,
      averageRating: d.averageRating ?? 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private mapPhotographerDoc(snap: QueryDocumentSnapshot<DocumentData>): PhotographerMonthlyAnalytics {
    const d = snap.data();
    return {
      id: snap.id,
      type: "photographer_monthly",
      photographerId: d.photographerId,
      month: d.month,
      bookingsReceived: d.bookingsReceived ?? 0,
      bookingsCompleted: d.bookingsCompleted ?? 0,
      bookingsCancelled: d.bookingsCancelled ?? 0,
      grossRevenue: d.grossRevenue ?? 0,
      roomsCreated: d.roomsCreated ?? 0,
      totalPhotosUploaded: d.totalPhotosUploaded ?? 0,
      totalDownloadRequests: d.totalDownloadRequests ?? 0,
      approvedDownloads: d.approvedDownloads ?? 0,
      reviewsReceived: d.reviewsReceived ?? 0,
      averageRatingThisMonth: d.averageRatingThisMonth ?? 0,
      cumulativeRating: d.cumulativeRating ?? 0,
      profileViews: d.profileViews ?? 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
