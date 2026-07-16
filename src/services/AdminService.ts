import { db } from "@/lib/firebase/firestore";
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { logger } from "@/utils/logger";
import { handleFirebaseError } from "@/lib/errors/handlers";
import type { Review, Booking, VirtualRoom, User, Photo, DownloadRequest } from "@/types";

export interface AdminDashboardStats {
  totalVisitors: number;
  totalPhotographers: number;
  totalBookings: number;
  totalRooms: number;
  activeRooms: number;
  totalPhotos: number;
  pendingDownloadRequests: number;
  totalDownloadRequests: number;
  totalReviews: number;
  totalUsers: number;
  totalRevenue: number;
}

export type BroadcastTarget = "all" | "all_users" | "all_photographers" | "photographer" | "user";
export type BroadcastType =
  | "system"
  | "update"
  | "maintenance"
  | "promotion"
  | "warning"
  | "security"
  | "success"
  | "general"
  | "booking_created"
  | "booking_notification"
  | "event_reminder"
  | "maintenance_notice"
  | "custom_message"
  | "system_announcement";

export class AdminService {
  private readonly photographersCol = "photographers";
  private readonly bookingsCol = "bookings";
  private readonly roomsCol = "virtual_rooms";
  private readonly photosCol = "photos";
  private readonly requestsCol = "download_requests";
  private readonly reviewsCol = "reviews";
  private readonly usersCol = "users";
  private readonly notificationsCol = "notifications";

  /**
   * Fetch core analytics counts for the admin dashboard.
   */
  public async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      logger.info("Fetching admin dashboard analytics stats");

      const [
        photographersCount,
        bookingsCount,
        roomsCount,
        photosCount,
        pendingDownloadsCount,
        totalDownloadsCount,
        reviewsCount,
        usersCount,
      ] = await Promise.all([
        getCountFromServer(collection(db, this.photographersCol)).then(s => s.data().count),
        getCountFromServer(collection(db, this.bookingsCol)).then(s => s.data().count),
        getCountFromServer(collectionGroup(db, "rooms")).then(s => s.data().count),
        getCountFromServer(collection(db, this.photosCol)).then(s => s.data().count),
        getCountFromServer(query(collection(db, this.requestsCol), where("status", "==", "pending"))).then(s => s.data().count),
        getCountFromServer(collection(db, this.requestsCol)).then(s => s.data().count),
        getCountFromServer(collection(db, this.reviewsCol)).then(s => s.data().count),
        getCountFromServer(collection(db, this.usersCol)).then(s => s.data().count),
      ]);

      // Sum total visitors from guestCount across all virtual event rooms
      const roomsSnap = await getDocs(collectionGroup(db, "rooms"));
      let totalVisitors = 0;
      let activeRooms = 0;
      roomsSnap.forEach((d) => {
        totalVisitors += d.data().guestCount || 0;
        if (d.data().status === "active" || d.data().status === "live") activeRooms++;
      });

      // Sum total revenue from completed/confirmed bookings
      const bookingsSnap = await getDocs(collection(db, this.bookingsCol));
      let totalRevenue = 0;
      bookingsSnap.forEach((d) => {
        const data = d.data();
        if (data.status === "completed" || data.status === "confirmed" || data.status === "in_progress") {
          totalRevenue += data.price || 0;
        }
      });

      return {
        totalPhotographers: photographersCount,
        totalBookings: bookingsCount,
        totalRooms: roomsCount,
        activeRooms,
        totalPhotos: photosCount,
        pendingDownloadRequests: pendingDownloadsCount,
        totalDownloadRequests: totalDownloadsCount,
        totalReviews: reviewsCount,
        totalUsers: usersCount,
        totalVisitors,
        totalRevenue,
      };
    } catch (error) {
      logger.error("Failed to fetch admin dashboard statistics", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch recent reviews for dashboard feed.
   */
  public async getRecentReviews(count = 5): Promise<Review[]> {
    try {
      const q = query(
        collection(db, this.reviewsCol),
        orderBy("createdAt", "desc"),
        limit(count)
      );
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to fetch recent reviews", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get all booking logs for dashboard management.
   */
  public async listAllBookings(): Promise<Booking[]> {
    try {
      const snap = await getDocs(query(collection(db, this.bookingsCol), orderBy("createdAt", "desc")));
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list all bookings", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all virtual rooms for admin.
   */
  public async listAllRooms(): Promise<VirtualRoom[]> {
    try {
      const snap = await getDocs(collectionGroup(db, "rooms"));
      const rooms = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as any));
      rooms.sort((a, b) => {
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === "function") return val.toMillis();
          if (typeof val.toDate === "function") return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        };
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });
      return rooms;
    } catch (error) {
      logger.error("Failed to list all virtual rooms", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all photos for admin.
   */
  public async listAllPhotos(pageSize = 50): Promise<Photo[]> {
    try {
      const snap = await getDocs(
        query(collection(db, this.photosCol), orderBy("createdAt", "desc"), limit(pageSize))
      );
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list all photos", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all users for admin.
   */
  public async listAllUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(query(collection(db, this.usersCol), orderBy("createdAt", "desc")));
      return snap.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list all users", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all download requests for admin.
   */
  public async listAllDownloadRequests(): Promise<DownloadRequest[]> {
    try {
      const snap = await getDocs(
        query(collection(db, this.requestsCol), orderBy("createdAt", "desc"))
      );
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list all download requests", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Send a broadcast notification to all users or photographers.
   */
  public async sendBroadcastNotification(params: {
    target: BroadcastTarget;
    targetId?: string; // for "photographer" target
    title: string;
    message: string;
    type?: string;
    actionUrl?: string;
    senderId?: string;
    senderRole?: string;
    priority?: "low" | "medium" | "high";
  }) : Promise<number> {
    try {
      const {
        target,
        targetId,
        title,
        message,
        type = "general",
        actionUrl,
        senderId = "",
        senderRole = "admin",
        priority = "medium"
      } = params;

      let recipientIds: { id: string; role: string }[] = [];

      if (target === "all") {
        const [photoSnap, userSnap] = await Promise.all([
          getDocs(query(collection(db, this.photographersCol))),
          getDocs(query(collection(db, this.usersCol))),
        ]);
        recipientIds = [
          ...photoSnap.docs.map(d => ({ id: d.id, role: "photographer" })),
          ...userSnap.docs.map(d => ({ id: d.id, role: d.data().role || "customer" })),
        ];
      } else if (target === "all_photographers") {
        const snap = await getDocs(query(collection(db, this.photographersCol)));
        recipientIds = snap.docs.map(d => ({ id: d.id, role: "photographer" }));
      } else if (target === "all_users") {
        const snap = await getDocs(query(collection(db, this.usersCol)));
        recipientIds = snap.docs.map(d => ({ id: d.id, role: "customer" }));
      } else if (target === "photographer" && targetId) {
        recipientIds = [{ id: targetId, role: "photographer" }];
      } else if (target === "user" && targetId) {
        // Resolve user role
        const snap = await getDocs(query(collection(db, this.usersCol)));
        const userDoc = snap.docs.find(d => d.id === targetId);
        const role = userDoc?.exists() ? (userDoc.data().role || "customer") : "customer";
        recipientIds = [{ id: targetId, role }];
      }

      if (recipientIds.length === 0) return 0;

      // Batch write in chunks of 500 (Firestore batch limit)
      const chunkSize = 499;
      let totalSent = 0;

      for (let i = 0; i < recipientIds.length; i += chunkSize) {
        const chunk = recipientIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(({ id, role }) => {
          const ref = doc(collection(db, this.notificationsCol));
          batch.set(ref, {
            recipientId: id,
            recipientRole: role,
            receiverId: id,
            receiverRole: role,
            senderId,
            senderRole,
            priority,
            type,
            title,
            message,
            actionUrl: actionUrl ?? null,
            actionLabel: actionUrl ? "View" : null,
            isRead: false,
            isSent: true,
            createdAt: serverTimestamp(),
          });
        });

        await batch.commit();
        totalSent += chunk.length;
      }

      logger.info(`Broadcast sent to ${totalSent} recipients`);
      return totalSent;
    } catch (error) {
      logger.error("Failed to send broadcast notification", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all photographers for admin.
   */
  public async listAllPhotographers(): Promise<any[]> {
    try {
      const snap = await getDocs(query(collection(db, this.photographersCol), orderBy("createdAt", "desc")));
      return snap.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      } as any));
    } catch (error) {
      logger.error("Failed to list all photographers", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update virtual room status (admin override).
   */
  public async updateRoomStatus(
    roomId: string,
    status: "active" | "closed" | "archived"
  ): Promise<void> {
    try {
      const q = query(
        collectionGroup(db, "rooms"),
        where("id", "==", roomId),
        limit(1)
      );
      const snaps = await getDocs(q);
      if (snaps.empty) {
        throw new Error(`Room with ID ${roomId} not found`);
      }
      const roomRef = snaps.docs[0].ref;
      await updateDoc(roomRef, {
        status,
        updatedAt: serverTimestamp(),
        ...(status === "closed" ? { closedAt: serverTimestamp() } : {}),
      });
    } catch (error) {
      logger.error(`Failed to update room status: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }
}

export const adminService = new AdminService();
export default adminService;
