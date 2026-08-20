import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const TEMP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += TEMP_CHARS[bytes[i] % TEMP_CHARS.length];
  }
  return result;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith("scrypt:")) {
    const parts = stored.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    const actual = scryptSync(plain, salt, 32);
    const expected = Buffer.from(hash, "hex");
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }
  return stored === plain;
}

export function generateSetupToken(): string {
  return `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function setupTokenExpires(days = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isTokenValid(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}
