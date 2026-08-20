import { Resend } from "resend";

export const PLATFORM_NAME = process.env.PLATFORM_NAME || "Gestion restaurant";

export const CONFIRM_TOKEN_HOURS = 24;

function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function confirmationUrl(token: string): string {
  return `${appUrl()}/confirmer-email?token=${encodeURIComponent(token)}`;
}

export function emailFrom(): string {
  return process.env.RESEND_FROM || `${PLATFORM_NAME} <beth.t@example.com>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

function confirmationHtml(input: {
  firstName: string;
  restaurantName: string;
  confirmUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F5F6FA;font-family:Arial,sans-serif;">
    <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;padding:32px;color:#1A1D23;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:0.08em;color:#1B3AE8;text-transform:uppercase;">${escapeHtml(PLATFORM_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:22px;">Bienvenue ${escapeHtml(input.firstName)}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151;">
        Votre restaurant « ${escapeHtml(input.restaurantName)} » est presque prêt. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre espace.
      </p>
      <p style="margin:24px 0;">
        <a href="${input.confirmUrl}" style="display:inline-block;background:#1B3AE8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;">
          Confirmer mon email
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6B7280;">
        Ce lien expire dans ${CONFIRM_TOKEN_HOURS} heures. Si vous n’êtes pas à l’origine de cette inscription, ignorez cet email.
      </p>
    </div>
  </body>
</html>`;
}

function confirmationText(input: {
  firstName: string;
  restaurantName: string;
  confirmUrl: string;
}): string {
  return [
    `Bonjour ${input.firstName},`,
    "",
    `Bienvenue sur ${PLATFORM_NAME}.`,
    `Confirmez votre adresse email pour activer l’espace de « ${input.restaurantName} ».`,
    "",
    input.confirmUrl,
    "",
    `Ce lien expire dans ${CONFIRM_TOKEN_HOURS} heures.`,
  ].join("\n");
}

export async function sendConfirmationEmail(input: {
  to: string;
  firstName: string;
  restaurantName: string;
  confirmUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "Service d’email non configuré" };
  }

  const subject = `Confirmez votre adresse email — ${PLATFORM_NAME}`;
  const html = confirmationHtml(input);
  const text = confirmationText(input);

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: input.to,
      subject,
      html,
      text,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Envoi impossible",
    };
  }
}

export function confirmationSubject(): string {
  return `Confirmez votre adresse email — ${PLATFORM_NAME}`;
}
