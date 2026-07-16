import { db } from "@/lib/firebase/firestore";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PlatformSettingsSchema, type ValidatedPlatformSettings } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { PlatformSettings, FeatureFlags, Settings } from "@/types";

const PLATFORM_DOC_ID = "platform";
const FEATURES_DOC_ID = "features";

export class SettingsService {
  private readonly collection = "settings";

  // ─── Platform Settings ────────────────────────────────────

  /**
   * Get the global platform settings document.
   */
  public async getPlatformSettings(): Promise<PlatformSettings | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, PLATFORM_DOC_ID));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        id: "platform",
        appName: d.appName ?? "SnapEvent",
        tagline: d.tagline ?? "",
        supportEmail: d.supportEmail ?? "",
        maintenanceMode: d.maintenanceMode ?? false,
        maintenanceMessage: d.maintenanceMessage,
        maxPhotosPerRoom: d.maxPhotosPerRoom ?? 500,
        maxRoomsPerPhotographer: d.maxRoomsPerPhotographer ?? 50,
        maxPortfolioImages: d.maxPortfolioImages ?? 20,
        downloadLinkExpiryHours: d.downloadLinkExpiryHours ?? 72,
        platformCommissionPercent: d.platformCommissionPercent ?? 10,
        cloudinaryFolder: d.cloudinaryFolder ?? "snapevent",
        updatedAt: d.updatedAt,
        updatedBy: d.updatedBy,
      };
    } catch (error) {
      logger.error("Failed to get platform settings:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update platform settings (admin only).
   */
  public async updatePlatformSettings(
    data: ValidatedPlatformSettings,
    adminId: string
  ): Promise<void> {
    try {
      const parsed = PlatformSettingsSchema.parse(data);
      await setDoc(
        doc(db, this.collection, PLATFORM_DOC_ID),
        {
          id: PLATFORM_DOC_ID,
          ...parsed,
          updatedAt: serverTimestamp(),
          updatedBy: adminId,
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("Failed to update platform settings:", error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Feature Flags ────────────────────────────────────────

  /**
   * Get the feature flags document.
   */
  public async getFeatureFlags(): Promise<FeatureFlags | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, FEATURES_DOC_ID));
      if (!snap.exists()) return this.getDefaultFeatureFlags();
      const d = snap.data();
      return {
        id: "features",
        enableFaceRecognition: d.enableFaceRecognition ?? true,
        enableQRCodeAccess: d.enableQRCodeAccess ?? true,
        enableGuestUpload: d.enableGuestUpload ?? false,
        enablePhotographerVerification: d.enablePhotographerVerification ?? true,
        enableEmailNotifications: d.enableEmailNotifications ?? true,
        enablePushNotifications: d.enablePushNotifications ?? false,
        enableReviews: d.enableReviews ?? true,
        enableWatermarking: d.enableWatermarking ?? true,
        enableAnalytics: d.enableAnalytics ?? true,
        updatedAt: d.updatedAt,
        updatedBy: d.updatedBy,
      };
    } catch (error) {
      logger.error("Failed to get feature flags:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update feature flags (admin only).
   */
  public async updateFeatureFlags(
    flags: Partial<Omit<FeatureFlags, "id" | "updatedAt" | "updatedBy">>,
    adminId: string
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, this.collection, FEATURES_DOC_ID),
        {
          id: FEATURES_DOC_ID,
          ...flags,
          updatedAt: serverTimestamp(),
          updatedBy: adminId,
        },
        { merge: true }
      );
    } catch (error) {
      logger.error("Failed to update feature flags:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Toggle a single feature flag (admin only).
   */
  public async toggleFeature(
    flagKey: keyof Omit<FeatureFlags, "id" | "updatedAt" | "updatedBy">,
    value: boolean,
    adminId: string
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, this.collection, FEATURES_DOC_ID),
        {
          [flagKey]: value,
          updatedAt: serverTimestamp(),
          updatedBy: adminId,
        },
        { merge: true }
      );
    } catch (error) {
      logger.error(`Failed to toggle feature flag "${flagKey}":`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private getDefaultFeatureFlags(): FeatureFlags {
    return {
      id: "features",
      enableFaceRecognition: true,
      enableQRCodeAccess: true,
      enableGuestUpload: false,
      enablePhotographerVerification: true,
      enableEmailNotifications: true,
      enablePushNotifications: false,
      enableReviews: true,
      enableWatermarking: true,
      enableAnalytics: true,
      updatedAt: null as unknown as import("firebase/firestore").Timestamp,
      updatedBy: "system",
    };
  }
}

export const settingsService = new SettingsService();
export default settingsService;
