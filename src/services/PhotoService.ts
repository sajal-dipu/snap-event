import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  increment,
} from "firebase/firestore";
import { PhotoSchema, type ValidatedPhoto } from "@/lib/validation/schemas";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { Photo, PhotoFilters, PhotoStatus, PaginatedResponse } from "@/types";

export class PhotoService {
  private readonly collection = "photos";

  /**
   * Save a photo record after a successful Cloudinary upload.
   */
  public async create(data: ValidatedPhoto): Promise<string> {
    try {
      const parsed = PhotoSchema.parse(data);
      const publicId = parsed.asset.publicId;
      console.log("Creating Firestore doc:", publicId);
      logger.info(`[PhotoService.create] Creating photo doc. roomId: ${parsed.roomId}, status: processing, isDeleted: false, caller: PhotoService.create`);

      const existingQuery = query(
        collection(db, this.collection),
        where("publicId", "==", publicId)
      );
      const existingSnaps = await getDocs(existingQuery);
      if (!existingSnaps.empty) {
        logger.info(`[PhotoService.create] Photo with publicId ${publicId} already exists. Skipping document creation.`);
        return existingSnaps.docs[0].id;
      }

      const docRef = await addDoc(collection(db, this.collection), {
        ...parsed,
        publicId,
        faces: [],
        faceCount: 0,
        isProcessed: false,
        tags: parsed.tags ?? [],
        status: "processing" as PhotoStatus,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Increment counters atomically safely
      const batch = writeBatch(db);
      const roomRef = doc(db, "photographers", parsed.photographerId, "rooms", parsed.roomId);
      batch.set(roomRef, {
        photoCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      const photographerRef = doc(db, "photographers", parsed.photographerId);
      batch.set(photographerRef, {
        totalPhotosUploaded: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await batch.commit();

      return docRef.id;
    } catch (error) {
      logger.error("Failed to create photo record:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single photo by ID.
   */
  public async getById(id: string): Promise<Photo | null> {
    try {
      const snap = await getDoc(doc(db, this.collection, id));
      if (!snap.exists()) return null;
      return this.mapDoc(snap);
    } catch (error) {
      logger.error(`Failed to fetch photo: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List photos for a room with optional filters and pagination.
   */
  public async listByRoom(
    roomId: string,
    filters: PhotoFilters = {},
    pageSize = 50,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<Photo>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("roomId", "==", roomId),
        where("isDeleted", "==", false),
      ];

      if (filters.status) constraints.push(where("status", "==", filters.status));
      if (filters.isProcessed !== undefined)
        constraints.push(where("isProcessed", "==", filters.isProcessed));

      constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(pageSize + 1));
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
      logger.error(`Failed to list photos for room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update photo status after AI processing completes.
   */
  public async updateStatus(photoId: string, status: PhotoStatus): Promise<void> {
    try {
      logger.info(`[PhotoService.updateStatus] photoId: ${photoId}, status: ${status}, caller: PhotoService.updateStatus`);
      await updateDoc(doc(db, this.collection, photoId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to update photo status: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Save AI face recognition results for a photo.
   */
  public async saveFaceData(
    photoId: string,
    faces: Photo["faces"]
  ): Promise<void> {
    try {
      logger.info(`[PhotoService.saveFaceData] photoId: ${photoId}, faceCount: ${faces.length}, status: ready, caller: PhotoService.saveFaceData`);
      await updateDoc(doc(db, this.collection, photoId), {
        faces,
        faceCount: faces.length,
        isProcessed: true,
        status: "ready" as PhotoStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to save face data for photo: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Mark face processing as failed.
   */
  public async markProcessingFailed(photoId: string, reason: string): Promise<void> {
    try {
      logger.info(`[PhotoService.markProcessingFailed] photoId: ${photoId}, reason: ${reason}, status: failed, caller: PhotoService.markProcessingFailed`);
      await updateDoc(doc(db, this.collection, photoId), {
        isProcessed: true,
        processingError: reason,
        status: "failed" as PhotoStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to mark photo processing failed: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Soft-delete a photo (marks isDeleted = true, keeps Cloudinary asset).
   */
  public async softDelete(photoId: string): Promise<void> {
    try {
      logger.info(`[PhotoService.softDelete] Soft-deleting photo. photoId: ${photoId}, status: deleted, isDeleted: true, caller: PhotoService.softDelete`);
      await updateDoc(doc(db, this.collection, photoId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        status: "deleted" as PhotoStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to soft-delete photo: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Hard-delete a photo document (admin only, after Cloudinary delete).
   */
  public async hardDelete(photoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collection, photoId));
    } catch (error) {
      logger.error(`Failed to hard-delete photo: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Bulk fetch photos by IDs (used in download request approval).
   */
  public async getByIds(photoIds: string[]): Promise<Photo[]> {
    try {
      const fetchPromises = photoIds.map((id) =>
        getDoc(doc(db, this.collection, id))
      );
      const snaps = await Promise.all(fetchPromises);
      return snaps
        .filter((s) => s.exists())
        .map((s) => this.mapDoc(s as QueryDocumentSnapshot<DocumentData>));
    } catch (error) {
      logger.error("Failed to bulk fetch photos:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update watermark flag on a batch of photos.
   */
  public async setWatermark(photoIds: string[], isWatermarked: boolean): Promise<void> {
    try {
      const batch = writeBatch(db);
      photoIds.forEach((id) => {
        batch.update(doc(db, this.collection, id), {
          isWatermarked,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      logger.error("Failed to update watermark status:", error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): Photo {
    const d = snap.data();
    return {
      id: snap.id,
      roomId: d.roomId,
      photographerId: d.photographerId,
      uploadedBy: d.uploadedBy,
      asset: d.asset,
      thumbnailUrl: d.thumbnailUrl,
      originalFilename: d.originalFilename,
      faces: d.faces ?? [],
      faceCount: d.faceCount ?? 0,
      isProcessed: d.isProcessed ?? false,
      processingError: d.processingError,
      takenAt: d.takenAt,
      gpsLocation: d.gpsLocation,
      tags: d.tags ?? [],
      status: d.status ?? "processing",
      isWatermarked: d.isWatermarked ?? false,
      isDeleted: d.isDeleted ?? false,
      deletedAt: d.deletedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const photoService = new PhotoService();
export default photoService;
