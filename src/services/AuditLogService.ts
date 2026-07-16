import { db } from "@/lib/firebase/firestore";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { handleFirebaseError } from "@/lib/errors/handlers";
import { logger } from "@/utils/logger";
import type { AuditLog, AuditAction, UserRole, PaginatedResponse } from "@/types";

export class AuditLogService {
  private readonly collection = "audit_logs";

  /**
   * Append a write-once audit log entry.
   * Call this after every significant admin or system action.
   */
  public async log(params: {
    action: AuditAction;
    performedBy: string;
    performedByRole: UserRole;
    targetId?: string;
    targetCollection?: string;
    targetType?: string;
    description: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    try {
      logger.info(`Audit: [${params.action}] by ${params.performedBy}`);
      const docRef = await addDoc(collection(db, this.collection), {
        ...params,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      // Audit logs must NOT block the main flow — log the error and continue
      logger.error("Failed to write audit log:", error);
      throw handleFirebaseError(error);
    }
  }

  /**
   * Fetch audit logs with filters (admin only).
   */
  public async list(
    filters: {
      performedBy?: string;
      action?: AuditAction;
      targetCollection?: string;
      targetId?: string;
    } = {},
    pageSize = 50,
    lastDocSnapshot?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResponse<AuditLog>> {
    try {
      const constraints: Parameters<typeof query>[1][] = [
        orderBy("createdAt", "desc"),
        limit(pageSize + 1),
      ];

      if (filters.performedBy) constraints.unshift(where("performedBy", "==", filters.performedBy));
      if (filters.action) constraints.unshift(where("action", "==", filters.action));
      if (filters.targetCollection) constraints.unshift(where("targetCollection", "==", filters.targetCollection));
      if (filters.targetId) constraints.unshift(where("targetId", "==", filters.targetId));

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
      logger.error("Failed to list audit logs:", error);
      throw handleFirebaseError(error);
    }
  }

  // ─── Private ─────────────────────────────────────────────

  private mapDoc(snap: QueryDocumentSnapshot<DocumentData>): AuditLog {
    const d = snap.data();
    return {
      id: snap.id,
      action: d.action,
      performedBy: d.performedBy,
      performedByRole: d.performedByRole,
      targetId: d.targetId,
      targetCollection: d.targetCollection,
      targetType: d.targetType,
      description: d.description,
      metadata: d.metadata,
      ipAddress: d.ipAddress,
      userAgent: d.userAgent,
      createdAt: d.createdAt,
    };
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
