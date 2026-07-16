import { db } from "@/lib/firebase/firestore";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserSchema, type ValidatedUser } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { User, UserRole } from "@/types";

export class AuthService {
  private readonly usersCollection = "users";

  /**
   * Create or update a user profile in Firestore on first login / registration.
   */
  public async createUserProfile(userData: ValidatedUser): Promise<User> {
    try {
      const parsed = UserSchema.parse(userData);
      logger.info(`Creating user profile for UID: ${parsed.uid}`);

      const ref = doc(db, this.usersCollection, parsed.uid);
      const existing = await getDoc(ref);

      // If user already exists, just update lastLoginAt
      if (existing.exists()) {
        await updateDoc(ref, { lastLoginAt: serverTimestamp() });
        return this.mapData(existing.id, existing.data() as Record<string, unknown>);
      }

      const profileData = {
        ...parsed,
        totalBookings: 0,
        totalDownloadRequests: 0,
        isActive: true,
        emailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      await setDoc(ref, profileData);

      return {
        uid: parsed.uid,
        email: parsed.email,
        displayName: parsed.displayName,
        role: parsed.role,
        photoURL: parsed.photoURL,
        phone: parsed.phone,
        totalBookings: 0,
        totalDownloadRequests: 0,
        isActive: true,
        emailVerified: false,
        provider: parsed.provider,
        createdAt: null as unknown as import("firebase/firestore").Timestamp,
        updatedAt: null as unknown as import("firebase/firestore").Timestamp,
      };
    } catch (error) {
      logger.error("Failed to create user profile:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch the full user profile from Firestore.
   */
  public async getUserProfile(uid: string): Promise<User | null> {
    try {
      logger.info(`Fetching user profile for UID: ${uid}`);
      const snap = await getDoc(doc(db, this.usersCollection, uid));

      if (!snap.exists()) {
        logger.warn(`No user profile found for UID: ${uid}`);
        return null;
      }

      return this.mapData(snap.id, snap.data());
    } catch (error) {
      logger.error(`Failed to fetch user profile for UID: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Determine which Firestore collection a user belongs to.
   * Checks admins, photographers, users in order.
   */
  public async resolveUserRole(uid: string): Promise<UserRole | null> {
    try {
      console.log(`[resolveUserRole debug] Starting role resolution for UID: "${uid}"`);

      let adminData: any = null;

      // 1. Direct document ID lookup
      try {
        const adminSnap = await getDoc(doc(db, "admins", uid));
        console.log(`[resolveUserRole debug] Direct lookup for admins/${uid}. exists: ${adminSnap.exists()}`);
        if (adminSnap.exists()) {
          adminData = adminSnap.data();
          console.log(`[resolveUserRole debug] Direct lookup retrieved data:`, JSON.stringify(adminData));
        }
      } catch (err: any) {
        console.error(`[resolveUserRole debug] Direct lookup for admins/${uid} failed:`, err);
      }

      // 2. Fallback query
      if (!adminData) {
        console.log(`[resolveUserRole debug] Fallback query for admins with uid == "${uid}"`);
        try {
          const q = query(collection(db, "admins"), where("uid", "==", uid));
          const querySnap = await getDocs(q);
          console.log(`[resolveUserRole debug] Fallback query empty: ${querySnap.empty}`);
          if (!querySnap.empty) {
            adminData = querySnap.docs[0].data();
            console.log(`[resolveUserRole debug] Fallback query retrieved data:`, JSON.stringify(adminData));
          }
        } catch (err: any) {
          console.error(`[resolveUserRole debug] Fallback query failed:`, err);
        }
      }

      // Evaluate admin data
      if (adminData) {
        const retrievedRole = adminData.role;
        const isActive = adminData.isActive;
        const finalResolvedRole = (retrievedRole && retrievedRole.toLowerCase() === "admin" && isActive === true) ? "admin" : null;

        console.log(`[resolveUserRole debug] Admin evaluation results:`);
        console.log(` - UID: "${uid}"`);
        console.log(` - Admin document exists: true`);
        console.log(` - Retrieved role: "${retrievedRole}"`);
        console.log(` - isActive: ${isActive}`);
        console.log(` - Final resolved role: "${finalResolvedRole}"`);

        if (finalResolvedRole === "admin") {
          return "admin";
        }
      } else {
        console.log(`[resolveUserRole debug] Admin evaluation results:`);
        console.log(` - UID: "${uid}"`);
        console.log(` - Admin document exists: false`);
        console.log(` - Final resolved role: null`);
      }

      // 2. Check photographers (Direct document ID lookup)
      const photographerSnap = await getDoc(doc(db, "photographers", uid));
      if (photographerSnap.exists()) {
        logger.info(`Resolved role: photographer for UID: ${uid}`);
        return "photographer";
      }

      // 3. Check users (Direct document ID lookup)
      const userSnap = await getDoc(doc(db, this.usersCollection, uid));
      if (userSnap.exists()) {
        const role = userSnap.data()?.role?.toLowerCase() as UserRole;
        const normalizedRole = role === "customer" ? "user" : role;
        logger.info(`Resolved role: ${normalizedRole} for UID: ${uid}`);
        return normalizedRole;
      }

      logger.warn(`Unknown User: UID ${uid} not found in any role collection.`);
      return null;
    } catch (error: any) {
      logger.error(`Failed to resolve role for UID: ${uid}`, error);

      const isPermissionDenied = error?.code === "permission-denied" ||
        error?.message?.includes("permission") ||
        error?.message?.includes("Missing or insufficient permissions");

      if (isPermissionDenied) {
        if (typeof window !== "undefined") {
          import("sonner").then(({ toast }) => {
            toast.error("Access Denied: You do not have permissions to view this resource.");
          });
        }
      }
      return null;
    }
  }

  /**
   * Update user profile fields (name, phone, address, photoURL).
   */
  public async updateProfile(
    uid: string,
    updates: Partial<Pick<User, "displayName" | "phone" | "address" | "photoURL" | "fcmToken">>
  ): Promise<void> {
    try {
      logger.info(`Updating user profile for UID: ${uid}`);
      await updateDoc(doc(db, this.usersCollection, uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update user profile for UID: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update last login timestamp.
   */
  public async touchLastLogin(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.usersCollection, uid), {
        lastLoginAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update lastLoginAt for UID: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark email as verified (called after Firebase email verification).
   */
  public async markEmailVerified(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.usersCollection, uid), {
        emailVerified: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to mark email verified for UID: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Deactivate a user account (soft delete).
   */
  public async deactivate(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.usersCollection, uid), {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to deactivate user: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapData(uid: string, d: Record<string, unknown>): User {
    return {
      uid: (d.uid as string) ?? uid,
      email: d.email as string,
      displayName: d.displayName as string,
      role: (d.role as User["role"]) ?? "customer",
      photoURL: d.photoURL as string | undefined,
      phone: d.phone as string | undefined,
      address: d.address as User["address"],
      totalBookings: (d.totalBookings as number) ?? 0,
      totalDownloadRequests: (d.totalDownloadRequests as number) ?? 0,
      isActive: (d.isActive as boolean) ?? true,
      emailVerified: (d.emailVerified as boolean) ?? false,
      fcmToken: d.fcmToken as string | undefined,
      provider: (d.provider as User["provider"]) ?? "email",
      createdAt: d.createdAt as import("firebase/firestore").Timestamp,
      updatedAt: d.updatedAt as import("firebase/firestore").Timestamp,
      lastLoginAt: d.lastLoginAt as import("firebase/firestore").Timestamp | undefined,
    };
  }
}

export const authService = new AuthService();
export default authService;
