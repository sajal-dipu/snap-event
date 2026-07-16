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
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { BookingSchema, type ValidatedBooking } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { Booking, BookingFilters, BookingStatus, PaginatedResponse } from "@/types";
import { roomService } from "./RoomService";

export class BookingService {
  private readonly collection = "bookings";

  /**
   * Create a new booking request.
   */
  public async create(data: ValidatedBooking): Promise<string> {
    try {
      const parsed = BookingSchema.parse(data);
      logger.info(`Creating booking for customer: ${parsed.customerId}`);

      const docRef = await addDoc(collection(db, this.collection), {
        ...parsed,
        userId: parsed.customerId,
        status: "pending",
        bookingStatus: "pending",
        hasReview: false,
        payment: {
          ...parsed.payment,
          status: "unpaid",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      logger.error("Failed to create booking:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Create a new booking request for an anonymous visitor (no-account booking).
   */
  public async createVisitorBooking(data: {
    photographerId: string;
    photographerName: string;
    photographerEmail: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    eventType: string;
    eventDate: string;
    eventTime: string;
    endTime?: string;
    eventLocation: string;
    city?: string;
    state?: string;
    pincode?: string;
    budget: number;
    guestCount: number;
    notes?: string;
    userId?: string;
    packageId?: string;
    packageName?: string;
    eventName?: string;
  }): Promise<string> {
    try {
      if (!data.userId) {
        throw new Error("Cannot submit a booking request without a user account.");
      }
      logger.info(`Creating visitor booking for: ${data.customerName} with photographer ${data.photographerId}`);

      const customerId = data.userId;
      const docRef = await addDoc(collection(db, this.collection), {
        customerId,
        userId: data.userId || customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        photographerId: data.photographerId,
        photographerName: data.photographerName,
        photographerEmail: data.photographerEmail,
        eventName: data.eventName || `${data.eventType} with ${data.photographerName}`,
        eventType: data.eventType,
        eventDate: Timestamp.fromDate(new Date(data.eventDate)),
        eventTime: data.eventTime,
        endTime: data.endTime || "",
        eventLocation: {
          city: data.city || "",
          state: data.state || "",
          country: "India",
          street: data.eventLocation,
          postalCode: data.pincode || "",
          pincode: data.pincode || ""
        },
        price: data.budget,
        currency: "INR",
        packageId: data.packageId || "",
        packageName: data.packageName || "",
        payment: {
          status: "unpaid",
          amount: data.budget,
          currency: "INR",
          refunded: false
        },
        guestCount: data.guestCount,
        notes: data.notes || "",
        status: "pending",
        bookingStatus: "pending",
        isArchived: false,
        hasReview: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      logger.error("Failed to create visitor booking:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single booking by ID.
   */
  public async getById(id: string): Promise<Booking | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, id));
      if (!snap.exists()) return null;
      return this.mapDoc(snap);
    } catch (error) {
      logger.error(`Failed to fetch booking: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List bookings with filters and pagination.
   */
  public async list(
    filters: BookingFilters = {},
    pageSize = 20,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<Booking>> {
    try {
      const ref = collection(db, this.collection);
      const constraints: Parameters<typeof query>[1][] = [];

      if (filters.customerId) constraints.push(where("customerId", "==", filters.customerId));
      if (filters.photographerId) constraints.push(where("photographerId", "==", filters.photographerId));
      if (filters.status) constraints.push(where("status", "==", filters.status));
      if (filters.isArchived !== undefined) {
        constraints.push(where("isArchived", "==", filters.isArchived));
      }

      if (filters.eventDateFrom) {
        constraints.push(where("eventDate", ">=", Timestamp.fromDate(new Date(filters.eventDateFrom))));
      }
      if (filters.eventDateTo) {
        constraints.push(where("eventDate", "<=", Timestamp.fromDate(new Date(filters.eventDateTo))));
      }

      const sortField = filters.sortBy === "event_date" ? "eventDate" : "createdAt";
      const sortDir = filters.sortBy === "oldest" ? "asc" : "desc";
      constraints.push(orderBy(sortField, sortDir));
      constraints.push(limit(pageSize + 1));
      if (lastDocSnapshot) constraints.push(startAfter(lastDocSnapshot));

      const snaps = await getDocs(query(ref, ...constraints));
      const hasMore = snaps.docs.length > pageSize;
      const docs = hasMore ? snaps.docs.slice(0, pageSize) : snaps.docs;

      return {
        data: docs.map((d) => this.mapDoc(d)),
        total: docs.length,
        hasMore,
      };
    } catch (error) {
      logger.error("Failed to list bookings:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update booking status. Automatically sets timestamps.
   */
  public async updateStatus(
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ): Promise<void> {
    try {
      const ref = doc(db, this.collection, bookingId);
      
      let displayStatus = status;
      if (status === "accepted") displayStatus = "confirmed";
      if (status === "rejected") displayStatus = "cancelled";

      const updates: Record<string, unknown> = {
        status: displayStatus,
        bookingStatus: status,
        updatedAt: serverTimestamp(),
      };

      switch (status) {
        case "confirmed":
          updates.confirmedAt = serverTimestamp();
          break;
        case "completed":
          updates.completedAt = serverTimestamp();
          break;
        case "cancelled":
          updates.cancelledAt = serverTimestamp();
          updates.cancellationReason = reason ?? null;
          break;
        case "refunded":
          updates["payment.status"] = "refunded";
          updates["payment.refundedAt"] = serverTimestamp();
          break;
      }

      await updateDoc(ref, updates);
    } catch (error) {
      logger.error(`Failed to update booking status: ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Link a virtual room to a confirmed booking (atomic).
   */
  public async linkRoom(bookingId: string, roomId: string): Promise<void> {
    try {
      const roomRef = await roomService.getRoomRef(roomId);
      const batch = writeBatch(db);

      const bookingRef = doc(db, this.collection, bookingId);
      batch.update(bookingRef, { roomId, updatedAt: serverTimestamp() });

      batch.update(roomRef, { bookingId, updatedAt: serverTimestamp() });

      await batch.commit();
    } catch (error) {
      logger.error(`Failed to link room ${roomId} to booking ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark booking as having a review (prevents duplicate reviews).
   */
  public async markReviewed(bookingId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, bookingId), {
        hasReview: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to mark booking as reviewed: ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update payment status and transaction details.
   */
  public async updatePayment(
    bookingId: string,
    transactionId: string,
    method: "razorpay" | "stripe" | "cash"
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, bookingId), {
        "payment.status": "paid",
        "payment.transactionId": transactionId,
        "payment.method": method,
        "payment.paidAt": serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update payment for booking: ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Toggle booking archive status.
   */
  public async setArchived(bookingId: string, isArchived: boolean): Promise<void> {
    try {
      const ref = doc(db, this.collection, bookingId);
      await updateDoc(ref, {
        isArchived,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to archive booking: ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Add internal notes to a booking.
   */
  public async addInternalNotes(bookingId: string, notes: string): Promise<void> {
    try {
      const ref = doc(db, this.collection, bookingId);
      await updateDoc(ref, {
        photographerNotes: notes,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to add internal notes for booking: ${bookingId}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): Booking {
    const d = snap.data();
    return {
      id: snap.id,
      customerId: d.customerId,
      userId: d.userId || d.customerId,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      photographerId: d.photographerId,
      photographerName: d.photographerName,
      photographerEmail: d.photographerEmail,
      eventName: d.eventName || "",
      eventType: d.eventType,
      eventDate: d.eventDate,
      eventTime: d.eventTime,
      endTime: d.endTime || "",
      eventLocation: d.eventLocation,
      durationHours: d.durationHours ?? 4,
      packageId: d.packageId,
      packageName: d.packageName,
      guestCount: d.guestCount,
      price: d.price,
      currency: d.currency ?? "INR",
      payment: d.payment,
      notes: d.notes,
      photographerNotes: d.photographerNotes,
      cancellationReason: d.cancellationReason,
      roomId: d.roomId,
      status: d.status,
      bookingStatus: d.bookingStatus || d.status,
      confirmedAt: d.confirmedAt,
      completedAt: d.completedAt,
      cancelledAt: d.cancelledAt,
      hasReview: d.hasReview ?? false,
      isArchived: d.isArchived ?? false,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const bookingService = new BookingService();
export default bookingService;
