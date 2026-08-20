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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmployeeInviteEmail(input: {
  to: string;
  employeeFirstName: string;
  gerantName: string;
  restaurantName: string;
  tempPassword: string;
}): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    console.error("Employee invite email: RESEND_API_KEY absente");
    return false;
  }

  const loginUrl = `${appUrl()}/login`;
  const from = env("RESEND_FROM") || "Gestion restaurant <beth.t@example.com>";
  const restaurant = input.restaurantName.trim() || "votre restaurant";
  const subject = `Vos identifiants de connexion — ${restaurant}`;
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject,
      text: [
        `Bonjour ${input.employeeFirstName},`,
        "",
        `${input.gerantName} vous a créé un compte sur l'espace de gestion de ${restaurant}.`,
        "",
        "Vos identifiants de connexion :",
        `Email : ${input.to}`,
        `Mot de passe temporaire : ${input.tempPassword}`,
        "",
        `Connectez-vous ici : ${loginUrl}`,
        "",
        "Important : changez votre mot de passe dès votre première connexion.",
        "",
        "À bientôt,",
        `L'équipe ${restaurant}`,
      ].join("\n"),
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 32px; color: #1A1D23;">
          <p>Bonjour ${escapeHtml(input.employeeFirstName)},</p>
          <p>${escapeHtml(input.gerantName)} vous a créé un compte sur l'espace de gestion de ${escapeHtml(restaurant)}.</p>
          <p><strong>Vos identifiants de connexion :</strong><br>
          Email : ${escapeHtml(input.to)}<br>
          Mot de passe temporaire : <strong>${escapeHtml(input.tempPassword)}</strong></p>
          <p>
            <a href="${loginUrl}" style="display:inline-block;background:#1B3AE8;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Connectez-vous ici
            </a>
          </p>
          <p>Important : changez votre mot de passe dès votre première connexion.</p>
          <p>À bientôt,<br>L'équipe ${escapeHtml(restaurant)}</p>
        </div>
      `,
    });
    if (error) {
      console.error("Employee invite email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Employee invite email:", error);
    return false;
  }
}

