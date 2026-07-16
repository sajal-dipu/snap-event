import { db } from "@/lib/firebase/firestore";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "@/types";
import { logger } from "@/utils/logger";
import { handleFirebaseError } from "@/lib/errors/handlers";

export class UserService {
  private readonly collectionName = "users";

  /**
   * List all users (customers).
   */
  public async listAll(): Promise<User[]> {
    try {
      logger.info("Listing all users for admin review");
      const snap = await getDocs(query(collection(db, this.collectionName), orderBy("createdAt", "desc")));
      return snap.docs.map((d) => ({
        uid: d.id,
        ...d.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list users", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Toggle user active/inactive status (suspend/activate).
   */
  public async toggleActiveStatus(uid: string, isActive: boolean): Promise<void> {
    try {
      logger.info(`Toggling active status for user ${uid} to: ${isActive}`);
      await updateDoc(doc(db, this.collectionName, uid), {
        isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update user active status for UID: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Permanently delete customer record.
   */
  public async deleteUser(uid: string): Promise<void> {
    try {
      logger.info(`Permanently deleting user profile: ${uid}`);
      await deleteDoc(doc(db, this.collectionName, uid));
    } catch (error) {
      logger.error(`Failed to delete user: ${uid}`, error);
      throw handleFirebaseError(error);
    }
  }
}

export const userService = new UserService();
export default userService;
