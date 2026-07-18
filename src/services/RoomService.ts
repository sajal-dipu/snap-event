import { db } from "@/lib/firebase/firestore";
import {
  doc,
  collection,
  collectionGroup,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  increment,
  writeBatch,
  setDoc,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { VirtualRoom, RoomStatus } from "@/types";
import { generateStrongPassword, hashPassword, generateSecurityCode } from "@/utils/crypto";
import { APP_URL } from "@/utils/helpers";



export class RoomService {
  private readonly subCollection = "rooms";

  /**
   * Helper to resolve a Room document reference from the collection group.
   */
  public async getRoomRef(roomId: string) {
    const q = query(collectionGroup(db, this.subCollection), where("id", "==", roomId), limit(1));
    const snaps = await getDocs(q);
    if (snaps.empty) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    return snaps.docs[0].ref;
  }

  /**
   * Helper to determine Room Status based on event date and time.
   * Maps to "active" or "completed" based on date.
   */
  public getRoomStatusFromDate(eventDate: Date, isArchived = false): RoomStatus {
    if (isArchived) return "archived";
    const now = new Date();
    const eventTime = eventDate.getTime();
    const nowTime = now.getTime();

    // Give a 1-day live window
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (eventTime + oneDayMs > nowTime) {
      return "active";
    } else {
      return "completed";
    }
  }

  /**
   * Create a new virtual event room with security configurations.
   */
  public async createRoom(
    data: {
      photographerId: string;
      photographerName: string;
      name: string;
      description?: string;
      eventType: string;
      eventDate: string;
      eventTime: string;
      eventLocation?: {
        street?: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
      };
      bookingId?: string;
      allowGuestAccess: boolean;
      requireFaceVerification: boolean;
      allowDownloadRequests: boolean;
      autoCloseRoom: boolean;
      autoCloseDate?: string;
      visibility: "public" | "private";
      coverImage?: string;
      id?: string;
      securityCode?: string;
    },
    cleartextPassword: string
  ): Promise<string> {
    console.log(`[createRoom] Starting. photographerId="${data.photographerId}" name="${data.name}"`);

    try {
      // 1. Generate Room ID (Firestore UUID – cryptographically unique, no duplicate check needed)
      const roomsCollectionRef = collection(db, "photographers", data.photographerId, this.subCollection);
      const roomRef = data.id
        ? doc(roomsCollectionRef, data.id)
        : doc(roomsCollectionRef);
      const roomId = roomRef.id;
      console.log(`[createRoom] Room document path: "${roomRef.path}"`);

      // 2. Hash the cleartext password
      console.log(`[createRoom] Hashing password...`);
      const pwHash = await hashPassword(cleartextPassword);

      // 3. Build QR code metadata
      const roomUrl = `${APP_URL}/event/${roomId}`;
      const qrCode = {
        code: roomId.substring(0, 8).toUpperCase(),
        url: roomUrl,
        imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomUrl)}`,
        publicId: "",
        generatedAt: Timestamp.now(),
      };

      // 4. Parse dates
      const eventDateObj = new Date(`${data.eventDate}T${data.eventTime || "00:00"}`);
      const autoCloseDateObj = data.autoCloseRoom && data.autoCloseDate ? new Date(data.autoCloseDate) : null;
      const initialStatus = this.getRoomStatusFromDate(eventDateObj);
      console.log(`[createRoom] eventDate="${data.eventDate}" initialStatus="${initialStatus}"`);

      // 5. Build the room payload
      const roomPayload = {
        id: roomId,
        photographerId: data.photographerId,
        photographerName: data.photographerName,
        name: data.name,
        description: data.description || "",
        eventType: data.eventType,
        eventDate: Timestamp.fromDate(eventDateObj),
        eventTime: data.eventTime || "",
        eventLocation: data.eventLocation || null,
        bookingId: data.bookingId || "",
        qrCode,
        passwordHash: pwHash,
        passwordCreatedAt: Timestamp.now(),
        passwordVersion: 1,
        securityCode: data.securityCode || "",

        allowGuestUpload: data.allowGuestAccess,
        allowGuestAccess: data.allowGuestAccess,
        requireFaceVerification: data.requireFaceVerification,
        requireApprovalForDownload: data.allowDownloadRequests,
        allowDownloadRequests: data.allowDownloadRequests,
        watermarkPhotos: true,
        autoCloseRoom: data.autoCloseRoom,
        autoCloseDate: autoCloseDateObj ? Timestamp.fromDate(autoCloseDateObj) : null,
        visibility: data.visibility,
        coverImage: data.coverImage || "",
        photoCount: 0,
        guestCount: 0,
        downloadRequestCount: 0,
        approvedDownloadCount: 0,
        qrScans: 0,
        galleryViews: 0,
        rejectedDownloadCount: 0,
        averageVisitDuration: 0,
        dailyVisitors: {},
        status: initialStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      console.log(`[createRoom] Room payload built. Writing to Firestore...`);

      // 6. Write room document first (separate from photographer update to isolate failures)
      await setDoc(roomRef, roomPayload);
      console.log(`[createRoom] Room document written successfully at "${roomRef.path}".`);

      // 7. Safely update/create photographer profile (do NOT use updateDoc on potentially missing document)
      const photographerRef = doc(db, "photographers", data.photographerId);
      console.log(`[createRoom] Checking photographer document at "${photographerRef.path}"...`);
      const photographerSnap = await getDoc(photographerRef);
      if (!photographerSnap.exists()) {
        console.warn(`[createRoom] Photographer profile MISSING. Creating default profile for UID=${data.photographerId}`);
        // Must satisfy Firestore security rule: keys hasAll ['uid', 'email', 'name', 'role', 'createdAt']
        const photographerEmail = (data.photographerName || "").includes("@")
          ? data.photographerName
          : `photographer+${data.photographerId}@snapevent.com`;
        await setDoc(photographerRef, {
          uid: data.photographerId,
          email: photographerEmail,
          name: data.photographerName || "Photographer",
          role: "photographer",
          totalRooms: 1,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        console.log(`[createRoom] Default photographer profile created.`);
      } else {
        console.log(`[createRoom] Photographer profile found. Incrementing totalRooms.`);
        await updateDoc(photographerRef, {
          totalRooms: increment(1),
          updatedAt: Timestamp.now(),
        });
      }
      console.log(`[createRoom] Room creation complete. roomId="${roomId}"`);
      return roomId;
    } catch (error: any) {
      console.error(`[createRoom] FAILED:`, error);
      logger.error("Failed to create virtual room:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Update virtual room settings and event info.
   */
  public async updateRoom(
    roomId: string,
    data: {
      name: string;
      description?: string;
      eventType: string;
      eventDate: string;
      eventTime: string;
      eventLocation?: {
        street?: string;
        city: string;
        state: string;
        country: string;
        postalCode?: string;
      };
      allowGuestAccess: boolean;
      requireFaceVerification: boolean;
      allowDownloadRequests: boolean;
      autoCloseRoom: boolean;
      autoCloseDate?: string;
      visibility: "public" | "private";
      status?: RoomStatus;
      coverImage?: string;
    },
    photographerId?: string
  ): Promise<void> {
    try {
      logger.info(`Updating virtual room: ${roomId}`);
      const eventDateObj = new Date(`${data.eventDate}T${data.eventTime}`);
      const autoCloseDateObj = data.autoCloseRoom && data.autoCloseDate ? new Date(data.autoCloseDate) : null;
      
      const status = data.status || this.getRoomStatusFromDate(eventDateObj);

      const roomRef = photographerId 
        ? doc(db, "photographers", photographerId, this.subCollection, roomId)
        : await this.getRoomRef(roomId);

      await updateDoc(roomRef, {
        name: data.name,
        description: data.description || "",
        eventType: data.eventType,
        eventDate: Timestamp.fromDate(eventDateObj),
        eventTime: data.eventTime,
        eventLocation: data.eventLocation || null,
        allowGuestUpload: data.allowGuestAccess,
        allowGuestAccess: data.allowGuestAccess,
        requireFaceVerification: data.requireFaceVerification,
        requireApprovalForDownload: data.allowDownloadRequests,
        allowDownloadRequests: data.allowDownloadRequests,
        autoCloseRoom: data.autoCloseRoom,
        autoCloseDate: autoCloseDateObj ? Timestamp.fromDate(autoCloseDateObj) : null,
        visibility: data.visibility,
        coverImage: data.coverImage || "",
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error(`Failed to update virtual room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Verify password for entering room management.
   */
  public async verifyRoomPassword(roomId: string, passwordHash: string): Promise<boolean> {
    try {
      const roomRef = await this.getRoomRef(roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return false;
      const d = snap.data();
      return d.passwordHash === passwordHash;
    } catch (error) {
      logger.error(`Failed to verify password for room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch a room by ID.
   */
  public async getById(id: string): Promise<VirtualRoom | null> {
    try {
      const q = query(collectionGroup(db, this.subCollection), where("id", "==", id), limit(1));
      const snaps = await getDocs(q);
      if (snaps.empty) return null;
      return this.mapDoc(snaps.docs[0]);
    } catch (error) {
      logger.error(`Failed to fetch room: ${id}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Find a room by its QR code short code.
   */
  public async findByCode(code: string): Promise<VirtualRoom | null> {
    try {
      const q = query(
        collectionGroup(db, this.subCollection),
        where("qrCode.code", "==", code),
        limit(1)
      );
      const snaps = await getDocs(q);
      if (snaps.empty) return null;
      const room = this.mapDoc(snaps.docs[0]);
      return room.status === "active" ? room : null;
    } catch (error) {
      logger.error(`Failed to find room by code: ${code}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * List all rooms for a photographer.
   */
  public async listByPhotographer(
    photographerId: string,
    status?: RoomStatus
  ): Promise<VirtualRoom[]> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        orderBy("createdAt", "desc"),
      ];
      if (status) constraints.push(where("status", "==", status));

      const snaps = await getDocs(
        query(collection(db, "photographers", photographerId, this.subCollection), ...constraints)
      );
      return snaps.docs.map((d) => this.mapDoc(d));
    } catch (error) {
      logger.error(`Failed to list rooms for photographer: ${photographerId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Duplicate room configuration with a new secure password.
   */
  public async duplicateRoom(roomId: string): Promise<{ id: string; password: string; securityCode: string }> {
    try {
      const originalRoom = await this.getById(roomId);
      if (!originalRoom) throw new Error("Original room not found");

      const newPassword = generateStrongPassword();
      const pwHash = await hashPassword(newPassword);

      // Generate unique Firestore ID for duplicate
      const photographerId = originalRoom.photographerId;
      const roomsCollectionRef = collection(db, "photographers", photographerId, this.subCollection);
      const roomRef = doc(roomsCollectionRef);
      const newRoomId = roomRef.id;

      // Duplicate room ID validation inside the photographer's rooms collection
      const q = query(roomsCollectionRef, where("id", "==", newRoomId), limit(1));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        throw new Error("Could not generate a unique Room ID for duplicate. Please try again.");
      }
      const roomUrl = `${APP_URL}/event/${newRoomId}`;

      const qrCode = {
        code: newRoomId.substring(0, 8).toUpperCase(),
        url: roomUrl,
        imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomUrl)}`,
        publicId: "",
        generatedAt: Timestamp.now(),
      };

      const newSecurityCode = generateSecurityCode();

      await setDoc(roomRef, {
        id: newRoomId,
        photographerId: originalRoom.photographerId,
        photographerName: originalRoom.photographerName,
        name: `${originalRoom.name} (Copy)`,
        description: originalRoom.description || "",
        eventType: originalRoom.eventType,
        eventDate: originalRoom.eventDate,
        eventLocation: originalRoom.eventLocation || null,
        bookingId: "", // remove booking links for duplicates
        qrCode,
        passwordHash: pwHash,
        passwordCreatedAt: Timestamp.now(),
        passwordVersion: 1,
        securityCode: newSecurityCode,
        allowGuestUpload: originalRoom.allowGuestUpload,
        allowGuestAccess: originalRoom.allowGuestAccess ?? true,
        requireFaceVerification: originalRoom.requireFaceVerification ?? false,
        requireApprovalForDownload: originalRoom.requireApprovalForDownload,
        allowDownloadRequests: originalRoom.allowDownloadRequests ?? true,
        watermarkPhotos: originalRoom.watermarkPhotos,
        autoCloseRoom: originalRoom.autoCloseRoom ?? false,
        autoCloseDate: originalRoom.autoCloseDate || null,
        visibility: originalRoom.visibility ?? "public",
        coverImage: originalRoom.coverImage || "",
        photoCount: 0,
        guestCount: 0,
        downloadRequestCount: 0,
        approvedDownloadCount: 0,
        qrScans: 0,
        galleryViews: 0,
        rejectedDownloadCount: 0,
        averageVisitDuration: 0,
        dailyVisitors: {},
        status: originalRoom.status,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Increment photographer room count
      const photographerRef = doc(db, "photographers", originalRoom.photographerId);
      await updateDoc(photographerRef, {
        totalRooms: increment(1),
        updatedAt: Timestamp.now(),
      });

      return { id: newRoomId, password: newPassword, securityCode: newSecurityCode };
    } catch (error) {
      logger.error(`Failed to duplicate room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Find a room by its security code and photographer ID.
   */
  public async recoverRoom(securityCode: string, photographerId: string): Promise<VirtualRoom | null> {
    try {
      const q = query(
        collectionGroup(db, this.subCollection),
        where("securityCode", "==", securityCode.trim().toUpperCase()),
        where("photographerId", "==", photographerId),
        limit(1)
      );
      const snaps = await getDocs(q);
      if (snaps.empty) {
        return null;
      }
      return this.mapDoc(snaps.docs[0]);
    } catch (error) {
      logger.error("Failed to recover room:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Delete virtual room from subcollection.
   */
  public async deleteRoom(
    roomId: string,
    photographerId: string,
    onProgress?: (stage: "photos" | "metadata" | "room" | "complete", details?: any) => void
  ): Promise<{ failedCloudinaryCount: number }> {
    try {
      console.log("Deleting Room:", roomId);

      // STEP 1: Fetch all photos belonging to that room in root collection
      const photosQuery = query(
        collection(db, "photos"),
        where("roomId", "==", roomId)
      );
      const photosSnap = await getDocs(photosQuery);
      const photos = photosSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() as any }));
      console.log("Photos Found:", photos.length);

      // STEP 2: Delete Cloudinary assets in a loop
      let failedCloudinaryCount = 0;
      onProgress?.("photos", { total: photos.length, current: 0 });

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        console.log(photo);
        console.log(photo.publicId);

        let targetPublicId = photo.publicId || photo.cloudinaryPublicId || photo.asset?.publicId;
        if (!targetPublicId && (photo.secureUrl || photo.url)) {
          const urlStr = photo.secureUrl || photo.url;
          const parts = urlStr.split('/upload/');
          if (parts.length === 2) {
            let pathAfterUpload = parts[1];
            const pathParts = pathAfterUpload.split('/');
            const versionIdx = pathParts.findIndex((p: string) => p.match(/^v\d+$/));
            if (versionIdx !== -1 && versionIdx < pathParts.length - 1) {
              const remaining = pathParts.slice(versionIdx + 1).join('/');
              const dotIdx = remaining.lastIndexOf('.');
              targetPublicId = dotIdx !== -1 ? remaining.substring(0, dotIdx) : remaining;
            } else {
              const lastPart = pathParts[pathParts.length - 1];
              const dotIdx = lastPart.lastIndexOf('.');
              targetPublicId = dotIdx !== -1 ? lastPart.substring(0, dotIdx) : lastPart;
            }
          }
        }

        if (targetPublicId) {
          try {
            let cleanPublicId = targetPublicId;
            const dotIndex = cleanPublicId.lastIndexOf(".");
            if (dotIndex !== -1) {
              cleanPublicId = cleanPublicId.substring(0, dotIndex);
            }

            const res = await fetch("/api/cloudinary/delete", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId: cleanPublicId, secureUrl: photo.secureUrl || photo.url }),
            });
            if (res.ok) {
              const result = await res.json();
              console.log(result);
              console.log("Deleted Cloudinary:", cleanPublicId);
            } else {
              console.error(`Failed to delete Cloudinary asset: ${cleanPublicId}`);
              failedCloudinaryCount++;
            }
          } catch (err) {
            console.error(`Error deleting Cloudinary asset: ${targetPublicId}`, err);
            failedCloudinaryCount++;
          }
        }
        onProgress?.("photos", { total: photos.length, current: i + 1 });
      }

      onProgress?.("metadata");

      // STEP 3 & 4: Fetch all other related Firestore metadata
      // 1. Nested photos in subcollection
      const subPhotosQuery = query(
        collection(db, "photographers", photographerId, "rooms", roomId, "photos")
      );
      const subPhotosSnap = await getDocs(subPhotosQuery);

      // 2. Guest mappings / download requests
      const reqsQuery1 = query(collection(db, "download_requests"), where("roomId", "==", roomId));
      const reqsQuery2 = query(collection(db, "downloadRequests"), where("roomId", "==", roomId));
      
      const [reqsSnap1, reqsSnap2] = await Promise.all([
        getDocs(reqsQuery1),
        getDocs(reqsQuery2),
      ]);

      // Collect all references to delete
      const refsToDelete: any[] = [];
      
      // Root photos
      photosSnap.docs.forEach((docSnap) => {
        refsToDelete.push(docSnap.ref);
        console.log("Deleted Metadata:", docSnap.id);
      });

      // Subcollection photos
      subPhotosSnap.docs.forEach((docSnap) => {
        refsToDelete.push(docSnap.ref);
      });

      // Download requests
      reqsSnap1.docs.forEach((docSnap) => {
        refsToDelete.push(docSnap.ref);
      });
      reqsSnap2.docs.forEach((docSnap) => {
        refsToDelete.push(docSnap.ref);
      });

      // Deleting in batch groups of 400 to avoid Firestore limits
      let batch = writeBatch(db);
      let opCount = 0;

      for (const ref of refsToDelete) {
        batch.delete(ref);
        opCount++;
        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      // STEP 5: Delete room document and STEP 6: update photographer counts
      onProgress?.("room");

      const roomRef = doc(db, "photographers", photographerId, this.subCollection, roomId);
      batch.delete(roomRef);

      const photographerRef = doc(db, "photographers", photographerId);
      batch.update(photographerRef, {
        totalRooms: increment(-1),
        totalPhotosUploaded: increment(-photos.length),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      logger.info(`Successfully deleted room ${roomId} and all related Firestore metadata.`);
      onProgress?.("complete");

      return { failedCloudinaryCount };
    } catch (error) {
      logger.error(`Failed to delete room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Atomically increment specific numeric counters in room.
   */
  public async incrementCount(
    roomId: string,
    field: "photoCount" | "guestCount" | "downloadRequestCount" | "approvedDownloadCount" | "qrScans" | "galleryViews" | "rejectedDownloadCount",
    by = 1
  ): Promise<void> {
    try {
      const roomRef = await this.getRoomRef(roomId);
      await updateDoc(roomRef, {
        [field]: increment(by),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error(`Failed to increment ${field} for room: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Increment daily visitor counts.
   */
  public async recordVisitor(roomId: string): Promise<void> {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const roomRef = await this.getRoomRef(roomId);
      
      await updateDoc(roomRef, {
        guestCount: increment(1),
        [`dailyVisitors.${todayStr}`]: increment(1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      logger.error(`Failed to record visitor analytics for room: ${roomId}`, error);
    }
  }

  /**
   * Admin: List all virtual rooms in the system.
   */
  public async listAllForAdmin(): Promise<VirtualRoom[]> {
    try {
      logger.info("Listing all rooms for admin");
      const snap = await getDocs(collectionGroup(db, this.subCollection));
      const rooms = snap.docs.map((d) => this.mapDoc(d));
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
      logger.error("Failed to list rooms for admin", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Admin: Safe room deletion (decrementing photographer room counters).
   */
  public async deleteRoomAdmin(roomId: string): Promise<void> {
    try {
      logger.info(`Admin safe deleting room: ${roomId}`);
      const room = await this.getById(roomId);
      if (!room) throw new Error("Room not found");
      await this.deleteRoom(roomId, room.photographerId);
    } catch (error) {
      logger.error(`Failed to delete room as admin: ${roomId}`, error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): VirtualRoom {
    const d = snap.data();
    return {
      id: snap.id,
      photographerId: d.photographerId,
      photographerName: d.photographerName,
      name: d.name,
      description: d.description,
      eventType: d.eventType,
      eventDate: d.eventDate,
      eventLocation: d.eventLocation,
      bookingId: d.bookingId,
      qrCode: d.qrCode,
      accessCode: d.accessCode,
      passwordHash: d.passwordHash,
      passwordCreatedAt: d.passwordCreatedAt,
      passwordVersion: d.passwordVersion ?? 1,
      securityCode: d.securityCode || "",

      allowGuestUpload: d.allowGuestUpload ?? false,
      requireApprovalForDownload: d.requireApprovalForDownload ?? true,
      watermarkPhotos: d.watermarkPhotos ?? true,
      autoCloseAt: d.autoCloseAt,
      visibility: d.visibility ?? "public",
      allowGuestAccess: d.allowGuestAccess ?? true,
      requireFaceVerification: d.requireFaceVerification ?? false,
      allowDownloadRequests: d.allowDownloadRequests ?? true,
      autoCloseRoom: d.autoCloseRoom ?? false,
      autoCloseDate: d.autoCloseDate,
      coverImage: d.coverImage || "",
      photoCount: d.photoCount ?? 0,
      guestCount: d.guestCount ?? 0,
      downloadRequestCount: d.downloadRequestCount ?? 0,
      approvedDownloadCount: d.approvedDownloadCount ?? 0,
      qrScans: d.qrScans ?? 0,
      galleryViews: d.galleryViews ?? 0,
      rejectedDownloadCount: d.rejectedDownloadCount ?? 0,
      averageVisitDuration: d.averageVisitDuration ?? 0,
      dailyVisitors: d.dailyVisitors ?? {},
      status: d.status ?? "active",
      closedAt: d.closedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}

export const roomService = new RoomService();
export default roomService;
