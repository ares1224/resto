import { findUserByConfirmToken, findUserByEmail, updatePlatformDb } from "@/lib/db/store";
import { isTokenValid } from "@/lib/password";
import {
  CONFIRM_TOKEN_HOURS,
  confirmationSubject,
  confirmationUrl,
  sendConfirmationEmail,
} from "@/lib/mail";
import type { User } from "@/types";

export function confirmTokenExpiresAt(): string {
  return new Date(Date.now() + CONFIRM_TOKEN_HOURS * 60 * 60 * 1000).toISOString();
}

function firstNameFromUser(user: User): string {
  return user.name.trim().split(/\s+/)[0] || user.name;
}

export async function sendGerantConfirmation(user: User, restaurantName: string): Promise<{ sent: boolean; error?: string }> {
  if (!user.emailConfirmToken) {
    return { sent: false, error: "Aucun lien de confirmation à envoyer" };
  }
  const result = await sendConfirmationEmail({
    to: user.email,
    firstName: firstNameFromUser(user),
    restaurantName,
    confirmUrl: confirmationUrl(user.emailConfirmToken),
  });

  await updatePlatformDb((platform) => {
    platform.outboundEmails.unshift({
      id: crypto.randomUUID(),
      to: user.email,
      subject: confirmationSubject(),
      body: result.sent ? "Email de confirmation envoyé." : `Échec d’envoi : ${result.error ?? "inconnu"}`,
      createdAt: new Date().toISOString(),
      sent: result.sent,
    });
    platform.outboundEmails = platform.outboundEmails.slice(0, 50);
  });

  return result;
}

export async function resendGerantConfirmation(email: string): Promise<{ ok: true } | { error: string; status: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { error: "Email requis", status: 400 };

  let snapshot: { user: User; restaurantName: string } | null = null;

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
      snapshot = { user: { ...user }, restaurantName: restaurant.name };
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
    throw e;
  }

  if (!snapshot) {
    return { error: "Impossible de préparer l’email", status: 500 };
  }

  const sent = await sendGerantConfirmation(snapshot.user, snapshot.restaurantName);
  if (!sent.sent) {
    return { error: sent.error || "Impossible d’envoyer l’email pour le moment", status: 502 };
  }
  return { ok: true };
}

export async function confirmSignupEmail(token: string): Promise<{ ok: true } | { error: string }> {
  if (!token) return { error: "Lien invalide" };

  try {
    await updatePlatformDb((platform) => {
      const found = findUserByConfirmToken(platform, token);
      if (!found || !isTokenValid(found.user.emailConfirmTokenExpires)) {
        throw new Error("INVALID_TOKEN");
      }

      const restaurant = platform.restaurants.find((r) => r.id === found.restaurantId);
      if (!restaurant) throw new Error("INVALID_TOKEN");

      const user = platform.tenants[found.restaurantId]?.users.find((u) => u.id === found.user.id);
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
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TOKEN") {
      return { error: "Lien expiré ou déjà utilisé" };
    }
    throw e;
  }
}
