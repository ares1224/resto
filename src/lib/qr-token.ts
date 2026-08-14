import type { Database, QrClockToken } from "@/types";
import { updateDb } from "@/lib/db/store";

const TOKEN_TTL_MS = 2 * 60 * 1000;

export async function issueQrToken(employeeId: string): Promise<QrClockToken> {
  const token: QrClockToken = {
    id: crypto.randomUUID(),
    employeeId,
    token: crypto.randomUUID().replace(/-/g, ""),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };

  await updateDb((db) => {
    db.qrClockTokens = db.qrClockTokens.filter(
      (t) => t.employeeId !== employeeId || new Date(t.expiresAt) > new Date()
    );
    db.qrClockTokens.push(token);
    db.qrClockTokens = db.qrClockTokens.slice(-200);
  });

  return token;
}

export function validateQrToken(db: Database, tokenStr: string): QrClockToken | null {
  const token = db.qrClockTokens.find((t) => t.token === tokenStr);
  if (!token) return null;
  if (new Date(token.expiresAt) < new Date()) return null;
  return token;
}

export function buildQrPayload(token: QrClockToken): string {
  return JSON.stringify({ v: 1, token: token.token, e: token.employeeId });
}
