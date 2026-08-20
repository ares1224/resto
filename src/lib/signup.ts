import { findUserByConfirmToken, updatePlatformDb } from "@/lib/db/store";
import { isTokenValid } from "@/lib/password";

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
