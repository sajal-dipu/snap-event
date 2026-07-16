import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  increment,
} from "firebase/firestore";
import { NotificationSchema, type ValidatedNotification } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { Notification, NotificationType } from "@/types";

export class NotificationService {
  private readonly collection = "notifications";

  /**
   * Dispatch a notification to a user.
   */
  public async send(data: any): Promise<string> {
    try {
      const parsed = NotificationSchema.parse(data);
      const receiverId = parsed.receiverId || parsed.recipientId;
      const receiverRole = parsed.receiverRole || parsed.recipientRole;
      if (!receiverId) throw new Error("Recipient ID or Receiver ID is required");
      if (!receiverRole) throw new Error("Recipient Role or Receiver Role is required");

      logger.info(`Sending notification [${parsed.type}] to user: ${receiverId}`);

      const docRef = await addDoc(collection(db, this.collection), {
        recipientId: receiverId,
        recipientRole: receiverRole,
        receiverId: receiverId,
        receiverRole: receiverRole,
        senderId: parsed.senderId || "",
        senderRole: parsed.senderRole || "",
        priority: parsed.priority || "medium",
        type: parsed.type,
        title: parsed.title,
        message: parsed.message,
        imageUrl: parsed.imageUrl || null,
        actionUrl: parsed.actionUrl || null,
        actionLabel: parsed.actionLabel || null,
        relatedId: parsed.relatedId || null,
        relatedType: parsed.relatedType || null,
        isRead: false,
        isSent: false,
        createdAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      logger.error("Failed to send notification:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Bulk send notification to multiple recipients.
   */
  public async sendBulk(notifications: any[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      notifications.forEach((data) => {
        const parsed = NotificationSchema.parse(data);
        const receiverId = parsed.receiverId || parsed.recipientId;
        const receiverRole = parsed.receiverRole || parsed.recipientRole;
        if (!receiverId || !receiverRole) return;

        const ref = doc(collection(db, this.collection));
        batch.set(ref, {
          recipientId: receiverId,
          recipientRole: receiverRole,
          receiverId: receiverId,
          receiverRole: receiverRole,
          senderId: parsed.senderId || "",
          senderRole: parsed.senderRole || "",
          priority: parsed.priority || "medium",
          type: parsed.type,
          title: parsed.title,
          message: parsed.message,
          imageUrl: parsed.imageUrl || null,
          actionUrl: parsed.actionUrl || null,
          actionLabel: parsed.actionLabel || null,
          relatedId: parsed.relatedId || null,
          relatedType: parsed.relatedType || null,
          isRead: false,
          isSent: false,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      logger.error("Failed to send bulk notifications:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch all notifications for a user (unread first, then by time).
   */
  public async getForUser(
    userId: string,
    unreadOnly = false,
    pageSize = 30
  ): Promise<Notification[]> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("recipientId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(pageSize),
      ];
      if (unreadOnly) constraints.push(where("isRead", "==", false));

      const snaps = await getDocs(query(collection(db, this.collection), ...constraints));
      return snaps.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error(`Failed to fetch notifications for user: ${userId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Get unread notification count for a user.
   */
  public async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.collection),
        where("recipientId", "==", userId),
        where("isRead", "==", false)
      );
      const snaps = await getDocs(q);
      return snaps.size;
    } catch (error) {
      logger.error(`Failed to get unread count for user: ${userId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark a single notification as read.
   */
  public async markRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, notificationId), {
        isRead: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to mark notification as read: ${notificationId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  public async markAllRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collection),
        where("recipientId", "==", userId),
        where("isRead", "==", false)
      );
      const snaps = await getDocs(q);

      const batch = writeBatch(db);
      snaps.docs.forEach((d) => {
        batch.update(d.ref, {
          isRead: true,
          readAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      logger.error(`Failed to mark all notifications read for user: ${userId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark FCM push as sent for a notification.
   */
  public async markSent(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, notificationId), {
        isSent: true,
      });
    } catch (error) {
      logger.error(`Failed to mark notification as sent: ${notificationId}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Typed Dispatch Helpers ───────────────────────────────

  /**
   * Notify a photographer of a new booking.
   */
  public async notifyBookingCreated(
    photographerId: string,
    bookingId: string,
    customerName: string
  ): Promise<void> {
    await this.send({
      recipientId: photographerId,
      recipientRole: "photographer",
      type: "booking_created" as NotificationType,
      title: "New Booking Request",
      message: `${customerName} has requested a booking with you.`,
      actionUrl: `/dashboard/bookings/${bookingId}`,
      actionLabel: "View Booking",
      relatedId: bookingId,
      relatedType: "booking",
    });
  }

  /**
   * Notify a customer that their booking was confirmed.
   */
  public async notifyBookingConfirmed(
    customerId: string,
    bookingId: string,
    photographerName: string
  ): Promise<void> {
    await this.send({
      recipientId: customerId,
      recipientRole: "customer",
      type: "booking_confirmed" as NotificationType,
      title: "Booking Confirmed!",
      message: `Your booking with ${photographerName} has been confirmed.`,
      actionUrl: `/bookings/${bookingId}`,
      actionLabel: "View Booking",
      relatedId: bookingId,
      relatedType: "booking",
    });
  }

  /**
   * Notify a photographer of a download request.
   */
  public async notifyDownloadRequested(
    photographerId: string,
    requestId: string,
    guestName: string,
    roomName: string
  ): Promise<void> {
    await this.send({
      recipientId: photographerId,
      recipientRole: "photographer",
      type: "download_requested" as NotificationType,
      title: "Photo Download Request",
      message: `${guestName} requested photo downloads from "${roomName}".`,
      actionUrl: `/dashboard/rooms/requests/${requestId}`,
      actionLabel: "Review Request",
      relatedId: requestId,
      relatedType: "download",
    });
  }

  /**
   * Notify a guest that their download was approved.
   */
  public async notifyDownloadApproved(
    customerId: string,
    requestId: string
  ): Promise<void> {
    await this.send({
      recipientId: customerId,
      recipientRole: "customer",
      type: "download_approved" as NotificationType,
      title: "Download Approved!",
      message: "Your photo download request has been approved. Download your photos now.",
      actionUrl: `/downloads/${requestId}`,
      actionLabel: "Download Photos",
      relatedId: requestId,
      relatedType: "download",
    });
  }

  /**
   * Dispatch a notification (alias to send).
   */
  public async sendNotification(data: ValidatedNotification): Promise<string> {
    return this.send(data);
  }

  /**
   * Bulk send notifications (alias to sendBulk).
   */
  public async sendBulkNotification(notifications: ValidatedNotification[]): Promise<void> {
    return this.sendBulk(notifications);
  }

  /**
   * Mark a single notification as read (alias to markRead).
   */
  public async markAsRead(notificationId: string): Promise<void> {
    return this.markRead(notificationId);
  }

  /**
   * Mark all unread notifications as read for a user (alias to markAllRead).
   */
  public async markAllAsRead(userId: string): Promise<void> {
    return this.markAllRead(userId);
  }

  /**
   * Delete a single notification from Firestore.
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    try {
      logger.info(`Deleting notification: ${notificationId}`);
      await deleteDoc(doc(db, this.collection, notificationId));
    } catch (error) {
      logger.error(`Failed to delete notification: ${notificationId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Subscribe to real-time notifications for a user.
   */
  public subscribeToNotifications(
    userId: string,
    onUpdate: (notifications: Notification[]) => void,
    limitCount = 50
  ): () => void {
    logger.info(`Subscribing to notifications for user: ${userId}`);
    const q = query(
      collection(db, this.collection),
      where("recipientId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => this.mapDoc(d));
        onUpdate(docs);
      },
      (error) => {
        logger.error(`Error in notification subscription for user ${userId}:`, error);
      }
    );

    return unsubscribe;
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): Notification {
    const d = snap.data();
    const receiverId = d.receiverId || d.recipientId || "";
    const receiverRole = d.receiverRole || d.recipientRole || "customer";
    return {
      id: snap.id,
      recipientId: d.recipientId || receiverId,
      recipientRole: d.recipientRole || receiverRole,
      receiverId,
      receiverRole,
      senderId: d.senderId || "",
      senderRole: d.senderRole || "",
      priority: d.priority || "medium",
      type: d.type,
      title: d.title,
      message: d.message,
      imageUrl: d.imageUrl,
      actionUrl: d.actionUrl,
      actionLabel: d.actionLabel,
      relatedId: d.relatedId,
      relatedType: d.relatedType,
      isRead: d.isRead ?? false,
      readAt: d.readAt,
      isSent: d.isSent ?? false,
      createdAt: d.createdAt,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
