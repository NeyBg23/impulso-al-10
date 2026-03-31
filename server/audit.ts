import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";

export interface AuditParams {
  userId?: number | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: number | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      previousValues: params.previousValues ?? null,
      newValues: params.newValues ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  } catch (err) {
    console.error("[Audit] Failed to create audit log:", err);
  }
}
