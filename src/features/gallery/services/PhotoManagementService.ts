import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
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
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { PhotoStatus } from "@/types";
import { roomService } from "@/services/RoomService";

export interface PhotoExif {
  camera?: string;
  lens?: string;
  iso?: number;
  shutterSpeed?: string;
  aperture?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  takenAt?: string;
}

export interface NewPhotoInput {
  roomId: string;
  photographerId: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  fileSize: number;
  fileName: string;
  albumId?: string | null;
  exif?: PhotoExif | null;
  tags?: string[];
}

export class PhotoManagementService {
  private readonly collectionName = "photos";

  /**
   * Save a uploaded photo record to Firestore.
   * Atomically updates room photo counts and photographer stats.
   */
  public async create(data: NewPhotoInput): Promise<string> {
    try {
      logger.info(`Creating photo metadata record for file: ${data.fileName} in room ${data.roomId}`);

      const photoRef = doc(collection(db, this.collectionName));
      const photoId = photoRef.id;

      const photoDoc = {
        id: photoId,
        imageId: photoId,
        photographerId: data.photographerId,
        roomId: data.roomId,
        cloudinaryPublicId: data.cloudinaryPublicId,
        secureUrl: data.secureUrl,
        url: data.secureUrl,
        thumbnailUrl: data.thumbnailUrl,
        thumbnail: data.thumbnailUrl,
        mediumUrl: data.mediumUrl,
        largeUrl: data.largeUrl,
        width: data.width,
        height: data.height,
        aspectRatio: data.aspectRatio,
        fileSize: data.fileSize,
        size: data.fileSize,
        fileName: data.fileName,
        uploadTime: serverTimestamp(),
        uploadStatus: "ready",
        faceProcessingStatus: "pending",
        downloadCount: 0,
        viewCount: 0,
        favorite: false,

        // Custom Album, Exif and tags
        albumId: data.albumId || null,
        exif: data.exif || null,
        tags: data.tags || [],

        // Compatibility fields for existing Photo interfaces
        uploadedBy: data.photographerId,
        asset: {
          publicId: data.cloudinaryPublicId,
          url: data.secureUrl,
          secureUrl: data.secureUrl,
          format: data.fileName.split(".").pop() || "jpg",
          width: data.width,
          height: data.height,
          bytes: data.fileSize,
          version: Date.now(),
        },
        originalFilename: data.fileName,
        status: "processing" as PhotoStatus,
        isDeleted: false,
        isWatermarked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      logger.info(`[PhotoManagementService.create] Writing photo doc. photoId: ${photoId}, roomId: ${data.roomId}, status: processing, isDeleted: false, caller: PhotoManagementService.create`);
      batch.set(photoRef, photoDoc);

      // Increment room photo count safely
      const roomRef = doc(db, "photographers", data.photographerId, "rooms", data.roomId);
      batch.set(roomRef, {
        photoCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Increment photographer uploaded count safely
      const photographerRef = doc(db, "photographers", data.photographerId);
      batch.set(photographerRef, {
        totalPhotosUploaded: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      return photoId;
    } catch (error) {
      logger.error("Failed to create photo metadata document:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a single photo by ID
   */
  public async getById(photoId: string): Promise<any | null> {
    try {
      const snap = await getDoc(doc(db, this.collectionName, photoId));
      if (!snap.exists()) return null;
      return snap.data();
    } catch (error) {
      logger.error(`Failed to fetch photo doc: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Increments the image views counter
   */
  public async incrementViews(photoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, photoId), {
        viewCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to increment viewCount for: ${photoId}`, error);
    }
  }

  /**
   * Increments the image downloads counter
   */
  public async incrementDownloads(photoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, photoId), {
        downloadCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to increment downloadCount for: ${photoId}`, error);
    }
  }

  /**
   * Query photos inside a Virtual Room with composite sorting and filtering.
   */
  public async queryPhotos(
    roomId: string,
    filters: {
      albumId?: string | null; // "all", "unassigned", or specific album ID
      favorite?: boolean;
      search?: string;
      sortBy?: string; // "newest" | "oldest" | "largest" | "smallest" | "most_viewed" | "most_downloaded"
    } = {},
    pageSize = 30,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ data: any[]; hasMore: boolean; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("roomId", "==", roomId),
        where("isDeleted", "==", false),
      ];

      // Favorite filter
      if (filters.favorite) {
        constraints.push(where("favorite", "==", true));
      }

      // Album filter
      if (filters.albumId === "unassigned") {
        constraints.push(where("albumId", "==", null));
      } else if (filters.albumId && filters.albumId !== "all") {
        constraints.push(where("albumId", "==", filters.albumId));
      }

      // Sorting
      const sortBy = filters.sortBy || "newest";
      if (sortBy === "newest") {
        constraints.push(orderBy("createdAt", "desc"));
      } else if (sortBy === "oldest") {
        constraints.push(orderBy("createdAt", "asc"));
      } else if (sortBy === "largest") {
        constraints.push(orderBy("fileSize", "desc"));
      } else if (sortBy === "smallest") {
        constraints.push(orderBy("fileSize", "asc"));
      } else if (sortBy === "most_viewed") {
        constraints.push(orderBy("viewCount", "desc"));
      } else if (sortBy === "most_downloaded") {
        constraints.push(orderBy("downloadCount", "desc"));
      } else if (sortBy === "filename") {
        // No orderBy on Firestore for filename to avoid missing index errors
      }

      constraints.push(limit(pageSize + 1));
      if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const snaps = await getDocs(q);

      const hasMore = snaps.docs.length > pageSize;
      const docs = hasMore ? snaps.docs.slice(0, pageSize) : snaps.docs;

      let result: any[] = docs.map((d) => ({ id: d.id, ...d.data() }));

      if (sortBy === "filename") {
        result.sort((a, b) => (a.fileName || "").localeCompare(b.fileName || ""));
      }

      // Client-side text search (filtering by file name, tags, or category)
      if (filters.search) {
        const term = filters.search.toLowerCase().trim();
        result = result.filter(
          (p) =>
            p.fileName.toLowerCase().includes(term) ||
            p.tags?.some((t: string) => t.toLowerCase().includes(term))
        );
      }

      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : undefined;

      return {
        data: result,
        hasMore,
        lastDoc,
      };
    } catch (error) {
      logger.error("Failed to query photos in room:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch all photographer favorites across ALL rooms.
   */
  public async getFavorites(
    photographerId: string,
    pageSize = 30,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ data: any[]; hasMore: boolean; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        where("photographerId", "==", photographerId),
        where("isDeleted", "==", false),
        where("favorite", "==", true),
        orderBy("createdAt", "desc"),
        limit(pageSize + 1),
      ];

      if (lastDocSnapshot) {
        constraints.push(startAfter(lastDocSnapshot));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const snaps = await getDocs(q);

      const hasMore = snaps.docs.length > pageSize;
      const docs = hasMore ? snaps.docs.slice(0, pageSize) : snaps.docs;

      return {
        data: docs.map((d) => ({ id: d.id, ...d.data() })),
        hasMore,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
      };
    } catch (error) {
      logger.error("Failed to fetch favorites:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch all soft-deleted photos (Trash bin) for a photographer.
   */
  public async getTrash(photographerId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("photographerId", "==", photographerId),
        where("isDeleted", "==", true),
        orderBy("deletedAt", "desc")
      );
      const snaps = await getDocs(q);
      return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      logger.error("Failed to fetch trash:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Toggle favorite flag on a photo.
   */
  public async toggleFavorite(photoId: string, favorite: boolean): Promise<void> {
    try {
      logger.info(`[PhotoManagementService.toggleFavorite] photoId: ${photoId}, favorite: ${favorite}, caller: PhotoManagementService.toggleFavorite`);
      await updateDoc(doc(db, this.collectionName, photoId), {
        favorite,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to favorite photo: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Rename a photo document.
   */
  public async rename(photoId: string, newName: string): Promise<void> {
    try {
      logger.info(`[PhotoManagementService.rename] photoId: ${photoId}, newName: ${newName}, caller: PhotoManagementService.rename`);
      await updateDoc(doc(db, this.collectionName, photoId), {
        fileName: newName,
        originalFilename: newName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error(`Failed to rename photo: ${photoId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Move photos into an album.
   */
  public async movePhotosToAlbum(photoIds: string[], albumId: string | null): Promise<void> {
    try {
      const batch = writeBatch(db);
      photoIds.forEach((id) => {
        logger.info(`[PhotoManagementService.movePhotosToAlbum] photoId: ${id}, albumId: ${albumId}, caller: PhotoManagementService.movePhotosToAlbum`);
        batch.update(doc(db, this.collectionName, id), {
          albumId,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (error) {
      logger.error("Failed to move photos to album:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Soft-delete photos (send to trash).
   */
  public async softDelete(photoIds: string[], roomId: string, photographerId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      photoIds.forEach((id) => {
        logger.info(`[PhotoManagementService.softDelete] Soft-deleting photo. photoId: ${id}, roomId: ${roomId}, status: deleted, isDeleted: true, caller: PhotoManagementService.softDelete`);
        batch.update(doc(db, this.collectionName, id), {
          isDeleted: true,
          status: "deleted" as PhotoStatus,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Update room photo count
      const roomRef = doc(db, "photographers", photographerId, "rooms", roomId);
      batch.update(roomRef, {
        photoCount: increment(-photoIds.length),
        updatedAt: serverTimestamp(),
      });

      // Update photographer uploaded count
      const photographerRef = doc(db, "photographers", photographerId);
      batch.update(photographerRef, {
        totalPhotosUploaded: increment(-photoIds.length),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      logger.error("Failed to soft delete photos:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Restore photos from trash.
   */
  public async restore(photoIds: string[], roomId: string, photographerId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      photoIds.forEach((id) => {
        logger.info(`[PhotoManagementService.restore] Restoring photo. photoId: ${id}, roomId: ${roomId}, status: ready, isDeleted: false, caller: PhotoManagementService.restore`);
        batch.update(doc(db, this.collectionName, id), {
          isDeleted: false,
          status: "ready" as PhotoStatus,
          deletedAt: null,
          updatedAt: serverTimestamp(),
        });
      });

      // Update room count
      const roomRef = doc(db, "photographers", photographerId, "rooms", roomId);
      batch.update(roomRef, {
        photoCount: increment(photoIds.length),
        updatedAt: serverTimestamp(),
      });

      // Update photographer count
      const photographerRef = doc(db, "photographers", photographerId);
      batch.update(photographerRef, {
        totalPhotosUploaded: increment(photoIds.length),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      logger.error("Failed to restore photos from trash:", error);
      throw handleFirebaseError(error);
    }
  }

  public async permanentDelete(photos: { id: string; cloudinaryPublicId: string }[]): Promise<void> {
    try {
      const publicIds = photos.map((p) => p.cloudinaryPublicId);

      // Call secure server delete endpoint
      const response = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete Cloudinary assets via server");
      }

      // Delete Firestore docs
      const deletePromises = photos.map((p) =>
        deleteDoc(doc(db, this.collectionName, p.id))
      );
      await Promise.all(deletePromises);
    } catch (error) {
      logger.error("Failed to permanently delete photos:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Create/Add album name in room configuration.
   */
  public async createAlbum(roomId: string, albumName: string): Promise<void> {
    try {
      const roomRef = await roomService.getRoomRef(roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) throw new Error("Room does not exist");
      const currentAlbums = roomSnap.data().albums || [];
      if (currentAlbums.includes(albumName)) return;

      await updateDoc(roomRef, {
        albums: [...currentAlbums, albumName],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("Failed to create room album:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Delete album name from room and reset any photo inside it.
   */
  public async deleteAlbum(roomId: string, albumName: string): Promise<void> {
    try {
      const roomRef = await roomService.getRoomRef(roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) throw new Error("Room does not exist");
      const currentAlbums = roomSnap.data().albums || [];
      const updatedAlbums = currentAlbums.filter((a: string) => a !== albumName);

      // 1. Update room document
      await updateDoc(roomRef, {
        albums: updatedAlbums,
        updatedAt: serverTimestamp(),
      });

      // 2. Fetch and reset photos with this albumId
      const q = query(
        collection(db, this.collectionName),
        where("roomId", "==", roomId),
        where("albumId", "==", albumName)
      );
      const photoSnaps = await getDocs(q);
      const batch = writeBatch(db);
      photoSnaps.docs.forEach((d) => {
        batch.update(d.ref, { albumId: null, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    } catch (error) {
      logger.error("Failed to delete room album:", error);
      throw handleFirebaseError(error);
    }
  }
}

export const photoManagementService = new PhotoManagementService();
export default photoManagementService;
