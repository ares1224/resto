import type { Session } from "@/lib/auth";
import type { Database } from "@/types";
import { updateDb } from "@/lib/db/store";

export async function logAudit(
  session: Session,
  action: string,
  details: string
): Promise<void> {
  await updateDb((db) => {
    db.auditLog.unshift({
      id: crypto.randomUUID(),
      userId: session.userId,
      userName: session.name,
      role: session.role,
      action,
      details,
      createdAt: new Date().toISOString(),
    });
    db.auditLog = db.auditLog.slice(0, 500);
  });
}

export function getAuditLogForGerant(db: Database) {
  return db.auditLog;
}
