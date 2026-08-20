import { findUserByConfirmToken, findUserByEmail, getPlatformDb, updatePlatformDb } from "@/lib/db/store";
import { isTokenValid } from "@/lib/password";
import { CONFIRM_TOKEN_HOURS } from "@/lib/mail";
import { sendConfirmationEmail } from "@/lib/email";
import type { User } from "@/types";
import { GENERIC_USER_ERROR } from "@/lib/public-error";

type SignupSnapshot = {
  user: User;
  restaurantName: string;
};

export function confirmTokenExpiresAt(): string {
  return new Date(Date.now() + CONFIRM_TOKEN_HOURS * 60 * 60 * 1000).toISOString();
}

export async function sendGerantConfirmation(user: User, restaurantName: string): Promise<{ sent: boolean; error?: string }> {
  if (!user.emailConfirmToken) {
    return { sent: false, error: "Échec de l'envoi de l'email" };
  }
  try {
    await sendConfirmationEmail(user.email, user.emailConfirmToken, {
      firstName: user.name.trim().split(/\s+/)[0] || user.name,
      restaurantName,
    });
    await updatePlatformDb((platform) => {
      platform.outboundEmails.unshift({
        id: crypto.randomUUID(),
        to: user.email,
        subject: "Confirmez votre adresse email",
        body: `Confirmation envoyée pour ${restaurantName}.`,
        createdAt: new Date().toISOString(),
        sent: true,
      });
      platform.outboundEmails = platform.outboundEmails.slice(0, 50);
    });
    return { sent: true };
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return { sent: false, error: "Échec de l'envoi de l'email" };
  }
}

export async function resendGerantConfirmation(email: string): Promise<{ ok: true } | { error: string; status: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { error: "Email requis", status: 400 };

  try {
    await updatePlatformDb((platform) => {
      const found = findUserByEmail(platform, normalized);
      if (!found?.user || found.user.role !== "gerant" || !found.restaurantId) {
        throw new Error("NOT_FOUND");
      }
      if (found.user.emailConfirmed) {
        throw new Error("ALREADY_CONFIRMED");
      }

      const user = platform.tenants[found.restaurantId]?.users.find((u) => u.id === found.user.id);
      const restaurant = platform.restaurants.find((r) => r.id === found.restaurantId);
      if (!user || !restaurant) throw new Error("NOT_FOUND");

      if (user.emailConfirmSentAt) {
        const elapsed = Date.now() - new Date(user.emailConfirmSentAt).getTime();
        if (elapsed < 60_000) throw new Error("TOO_SOON");
      }

      user.emailConfirmToken = crypto.randomUUID();
      user.emailConfirmTokenExpires = confirmTokenExpiresAt();
      user.emailConfirmSentAt = new Date().toISOString();
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { error: "Aucun compte en attente de confirmation pour cet email", status: 404 };
    }
    if (e instanceof Error && e.message === "ALREADY_CONFIRMED") {
      return { error: "Ce compte est déjà activé. Connectez-vous.", status: 409 };
    }
    if (e instanceof Error && e.message === "TOO_SOON") {
      return { error: "Un email vient d’être envoyé. Réessayez dans une minute.", status: 429 };
    }
    console.error("Resend confirmation error:", e);
    return { error: GENERIC_USER_ERROR, status: 500 };
  }

  const platform = await getPlatformDb();
  const found = findUserByEmail(platform, normalized);
  const restaurant = found?.restaurantId
    ? platform.restaurants.find((r) => r.id === found.restaurantId)
    : undefined;
  if (!found?.user || !restaurant) {
    return { error: "Impossible de préparer l’email", status: 500 };
  }

  const snapshot = { user: found.user, restaurantName: restaurant.name } as SignupSnapshot;
  // @ts-ignore
  const sent = await sendGerantConfirmation(snapshot.user, snapshot.restaurantName);
  if (!sent.sent) {
    return { error: sent.error || "Impossible d’envoyer l’email pour le moment", status: 502 };
  }
  return { ok: true };
}

export async function confirmSignupEmail(
  token: string
): Promise<{ ok: true; user: User } | { expired: true; email: string } | { error: string }> {
  if (!token) return { error: "Lien invalide" };

  const platform = await getPlatformDb();
  const found = findUserByConfirmToken(platform, token);
  if (!found) {
    return { error: "Lien invalide" };
  }
  if (!isTokenValid(found.user.emailConfirmTokenExpires)) {
    return { expired: true, email: found.user.email };
  }

  try {
    let confirmed: User | undefined;
    await updatePlatformDb((platform) => {
      const current = findUserByConfirmToken(platform, token);
      if (!current || !isTokenValid(current.user.emailConfirmTokenExpires)) {
        throw new Error("INVALID_TOKEN");
      }

      const restaurant = platform.restaurants.find((r) => r.id === current.restaurantId);
      if (!restaurant) throw new Error("INVALID_TOKEN");

      const user = platform.tenants[current.restaurantId]?.users.find((u) => u.id === current.user.id);
      if (!user) throw new Error("INVALID_TOKEN");

      user.emailConfirmed = true;
      user.emailConfirmToken = undefined;
      user.emailConfirmTokenExpires = undefined;

      const now = new Date().toISOString();
      restaurant.emailConfirmedAt = now;
      if (restaurant.status === "pending") {
        restaurant.status = "active";
      }

      platform.platformNotifications.unshift({
        id: crypto.randomUUID(),
        title: "Restaurant activé",
        message: `${restaurant.name} a confirmé son email. L’espace est actif.`,
        read: false,
        createdAt: now,
        restaurantId: restaurant.id,
      });
      platform.platformNotifications = platform.platformNotifications.slice(0, 100);
      confirmed = { ...user, restaurantId: current.restaurantId };
    });
    if (!confirmed) return { error: GENERIC_USER_ERROR };
    return { ok: true, user: confirmed };
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TOKEN") {
      return { error: "Lien invalide" };
    }
    console.error("Confirm email error:", e);
    return { error: GENERIC_USER_ERROR };
  }
}
