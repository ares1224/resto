const TEMP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 10): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += TEMP_CHARS[Math.floor(Math.random() * TEMP_CHARS.length)];
  }
  return result;
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
