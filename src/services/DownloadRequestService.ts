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
  increment,
} from "firebase/firestore";
import { DownloadRequestSchema, type ValidatedDownloadRequest } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type {
  DownloadRequest,
  DownloadRequestFilters,
  DownloadRequestStatus,
  PaginatedResponse,
} from "@/types";

export class DownloadRequestService {
  private readonly collection = "downloadRequests";

  /**
   * Guest submits a download request (optionally with selfie for face match).
   */
  public async create(data: ValidatedDownloadRequest): Promise<string> {
    try {
      const parsed = DownloadRequestSchema.parse(data);
      logger.info(`Creating download request for room: ${parsed.roomId}`);

      const docRef = await addDoc(collection(db, this.collection), {
        ...parsed,
        roomId: parsed.roomId,
        guestUid: parsed.customerId,
        guestName: parsed.customerName,
        email: parsed.customerEmail || "",
        phone: parsed.customerPhone || "",
        requestedPhotos: parsed.requestedPhotoIds || [],
        approvedPhotoIds: [],
        rejectedPhotoIds: [],
        matchedPhotoIds: [],
        matchConfidence: 0,
        status: "pending" as DownloadRequestStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Increment room download request counter
      const roomRef = doc(db, "photographers", parsed.photographerId, "rooms", parsed.roomId);
      await updateDoc(roomRef, {
        downloadRequestCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      logger.error("Failed to create download request:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single download request by ID.
   */
  public async getById(id: string): Promise<DownloadRequest | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, id));
      if (!snap.exists()) return null;
      return this.mapDoc(snap);
    } catch (error) {
      logger.error(`Failed to fetch download request: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List download requests for a room (photographer view).
   */
  public async listByRoom(
    roomId: string,
    filters: DownloadRequestFilters = {},
    pageSize = 20,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<DownloadRequest>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("roomId", "==", roomId),
      ];
      if (filters.status) constraints.push(where("status", "==", filters.status));

      const snaps = await getDocs(query(collection(db, this.collection), ...constraints));
      let docs = snaps.docs;

      // Sort in-memory to avoid missing composite index crashes
      docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : new Date(a.data().createdAt || 0).getTime();
        const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : new Date(b.data().createdAt || 0).getTime();
        return filters.sortBy === "oldest" ? timeA - timeB : timeB - timeA;
      });

      const hasMore = docs.length > pageSize;
      const slicedDocs = hasMore ? docs.slice(0, pageSize) : docs;

      return {
        data: slicedDocs.map((d) => this.mapDoc(d)),
        total: slicedDocs.length,
        hasMore,
      };
    } catch (error) {
      logger.error(`Failed to list download requests for room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List download requests for a photographer across all their rooms.
   */
  public async listByPhotographer(
    photographerId: string,
    filters: DownloadRequestFilters = {},
    pageSize = 30,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<DownloadRequest>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("photographerId", "==", photographerId),
      ];
      if (filters.status) constraints.push(where("status", "==", filters.status));

      const snaps = await getDocs(query(collection(db, this.collection), ...constraints));
      let docs = snaps.docs;

      // Sort in-memory to avoid missing composite index crashes
      docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : new Date(a.data().createdAt || 0).getTime();
        const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : new Date(b.data().createdAt || 0).getTime();
        return filters.sortBy === "oldest" ? timeA - timeB : timeB - timeA;
      });

      const hasMore = docs.length > pageSize;
      const slicedDocs = hasMore ? docs.slice(0, pageSize) : docs;

      return {
        data: slicedDocs.map((d) => this.mapDoc(d)),
        total: slicedDocs.length,
        hasMore,
      };
    } catch (error) {
      logger.error(`Failed to list download requests for photographer: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List a customer's download request history.
   */
  public async listByCustomer(
    customerId: string,
    pageSize = 20,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<DownloadRequest>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("customerId", "==", customerId),
      ];

      const snaps = await getDocs(query(collection(db, this.collection), ...constraints));
      let docs = snaps.docs;

      // Sort in-memory to avoid missing composite index crashes
      docs.sort((a, b) => {
        const timeA = a.data().createdAt?.toMillis ? a.data().createdAt.toMillis() : new Date(a.data().createdAt || 0).getTime();
        const timeB = b.data().createdAt?.toMillis ? b.data().createdAt.toMillis() : new Date(b.data().createdAt || 0).getTime();
        return timeB - timeA;
      });

      const hasMore = docs.length > pageSize;
      const slicedDocs = hasMore ? docs.slice(0, pageSize) : docs;

      return {
        data: slicedDocs.map((d) => this.mapDoc(d)),
        total: slicedDocs.length,
        hasMore,
      };
    } catch (error) {
      logger.error(`Failed to list download requests for customer: ${customerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Photographer approves a download request.
   */
  public async approve(
    requestId: string,
    approvedPhotoIds: string[],
    downloadExpiresAt: Date,
    reviewedBy: string,
    downloadToken: string,
    internalNotes?: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, requestId), {
        status: "approved" as DownloadRequestStatus,
        approvedPhotoIds,
        downloadExpiresAt,
        downloadToken,
        internalNotes: internalNotes || "",
        downloadCount: 0,
        reviewedAt: serverTimestamp(),
        reviewedBy,
        updatedAt: serverTimestamp(),
      });

      // Get the request to update the room counter
      const snap = await getDoc(doc(db, this.collection, requestId));
      if (snap.exists()) {
        const roomRef = doc(db, "photographers", snap.data().photographerId, "rooms", snap.data().roomId);
        await updateDoc(roomRef, {
          approvedDownloadCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      logger.error(`Failed to approve download request: ${requestId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Photographer rejects a download request.
   */
  public async reject(
    requestId: string,
    reason: string,
    reviewedBy: string,
    internalNotes?: string
  ): Promise<void> {
    try {
      const snap = await getDoc(doc(db, this.collection, requestId));
      if (!snap.exists()) throw new Error("Request not found");

      const requestedPhotoIds = snap.data().requestedPhotoIds as string[];

      await updateDoc(doc(db, this.collection, requestId), {
        status: "rejected" as DownloadRequestStatus,
        rejectedPhotoIds: requestedPhotoIds,
        rejectionReason: reason,
        internalNotes: internalNotes || "",
        reviewedAt: serverTimestamp(),
        reviewedBy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to reject download request: ${requestId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Save face match results from the AI service.
   */
  public async saveFaceMatchResults(
    requestId: string,
    matchedPhotoIds: string[],
    matchConfidence: number
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, requestId), {
        matchedPhotoIds,
        matchConfidence: parseFloat(matchConfidence.toFixed(3)),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to save face match results: ${requestId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark a download request as expired.
   */
  public async expire(requestId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collection, requestId), {
        status: "expired" as DownloadRequestStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to expire download request: ${requestId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Tracks guest download session analytics.
   */
  public async trackDownload(
    requestId: string,
    device: string,
    ip?: string
  ): Promise<void> {
    try {
      // 1. Increment total download counter on request doc
      await updateDoc(doc(db, this.collection, requestId), {
        downloadCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // 2. Add history record
      await addDoc(collection(db, "download_history"), {
        requestId,
        downloadedAt: serverTimestamp(),
        device,
        ip: ip || "unknown",
      });

      logger.info(`Tracked download session for request: ${requestId}`);
    } catch (error) {
      logger.error(`Failed to track download: ${requestId}`, error);
    }
  }

  /**
   * List download history records for requests.
   */
  public async getHistory(requestId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, "download_history"),
        where("requestId", "==", requestId),
        orderBy("downloadedAt", "desc")
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
    } catch (error) {
      logger.error(`Failed to get download history for request: ${requestId}`, error);
      return [];
    }
  }

  /**
   * Fetch a download request by its unique token.
   */
  public async getByToken(token: string): Promise<DownloadRequest | null> {
    try {
      logger.info(`Fetching download request by token: ${token}`);
      const q = query(
        collection(db, this.collection),
        where("downloadToken", "==", token),
        limit(1)
      );
      const snaps = await getDocs(q);
      if (snaps.empty) return null;
      return this.mapDoc(snaps.docs[0]);
    } catch (error) {
      logger.error(`Failed to fetch download request by token: ${token}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): DownloadRequest {
    const d = snap.data();
    return {
      id: snap.id,
      roomId: d.roomId,
      photographerId: d.photographerId,
      customerId: d.guestUid || d.customerId || "",
      guestUid: d.guestUid || d.customerId || "",
      customerName: d.guestName || d.customerName || "",
      guestName: d.guestName || d.customerName || "",
      customerPhone: d.phone || d.customerPhone || "",
      phone: d.phone || d.customerPhone || "",
      customerEmail: d.email || d.customerEmail || "",
      email: d.email || d.customerEmail || "",
      specialMessage: d.specialMessage,
      selfiePublicId: d.selfiePublicId,
      requestedPhotoIds: d.requestedPhotos || d.requestedPhotoIds || [],
      requestedPhotos: d.requestedPhotos || d.requestedPhotoIds || [],
      approvedPhotoIds: d.approvedPhotoIds ?? [],
      rejectedPhotoIds: d.rejectedPhotoIds ?? [],
      matchedPhotoIds: d.matchedPhotoIds ?? [],
      matchConfidence: d.matchConfidence ?? 0,
      downloadUrl: d.downloadUrl,
      downloadExpiresAt: d.downloadExpiresAt,
      downloadToken: d.downloadToken,
      downloadCount: d.downloadCount ?? 0,
      internalNotes: d.internalNotes,
      status: d.status ?? "pending",
      reviewedAt: d.reviewedAt,
      reviewedBy: d.reviewedBy,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const downloadRequestService = new DownloadRequestService();
export default downloadRequestService;
