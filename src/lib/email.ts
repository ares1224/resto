import { Resend } from "resend";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function appUrl(): string {
  const explicit = env("NEXT_PUBLIC_APP_URL") || env("APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = env("VERCEL_URL").replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function sendConfirmationEmail(email: string, token: string) {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    console.error("Erreur envoi email: RESEND_API_KEY absente");
    throw new Error("Échec de l'envoi de l'email");
  }

  const confirmUrl = `${appUrl()}/confirmer-email?token=${encodeURIComponent(token)}`;
  const from = env("RESEND_FROM") || "RestoManager <beth.t@example.com>";
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: email,
    subject: "Confirmez votre adresse email",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 32px;">
        <h2>Bienvenue sur RestoManager</h2>
        <p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.</p>
        <a href="${confirmUrl}" style="
          display: inline-block;
          background: #1B3AE8;
          color: white;
          padding: 14px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 16px;
        ">Confirmer mon email</a>
        <p style="color: #6B7280; font-size: 13px; margin-top: 24px;">
          Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Erreur envoi email:", error);
    throw new Error("Échec de l'envoi de l'email");
  }

  return data;
}
