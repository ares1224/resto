function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function confirmationUrl(token: string): string {
  return `${appUrl()}/confirmer-email?token=${encodeURIComponent(token)}`;
}

export async function deliverEmail(input: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Bistrot Gestion <noreply@resend.dev>",
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
