export const GENERIC_USER_ERROR = "Une erreur est survenue, veuillez réessayer.";

const TECHNICAL_PATTERN =
  /blob|vercel|credential|stockage persistant|internal error|unauthorized|forbidden|enoent|eacces|econn|etimedout|traceback|typeerror|referenceerror|syntaxerror|prisma|mongodb|postgres|\bsql\b|fetch failed|module not found|cannot find|undefined is not|at https?:|file:\/\//i;

export function isTechnicalError(message: unknown): boolean {
  if (typeof message !== "string") return true;
  const text = message.trim();
  if (!text) return true;
  if (text.length > 160) return true;
  if (TECHNICAL_PATTERN.test(text)) return true;
  if (/^[A-Za-z]+Error:/.test(text)) return true;
  return false;
}

export function toPublicError(message: unknown, fallback = GENERIC_USER_ERROR): string {
  if (typeof message !== "string" || isTechnicalError(message)) {
    return fallback;
  }
  return message.trim();
}
