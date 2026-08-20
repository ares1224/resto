import { NextResponse } from "next/server";
import { requireSuperAdmin, apiError } from "@/lib/api-auth";
import { getPlatformDb, updatePlatformDb } from "@/lib/db/store";
import type { RestaurantStatus } from "@/types";

export async function GET() {
  try {
    await requireSuperAdmin();
    const platform = await getPlatformDb();
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const restaurants = platform.restaurants
      .map((r) => {
        const tenant = platform.tenants[r.id];
        const employeeCount = tenant?.employees.filter((e) => e.active).length ?? 0;
        return {
          id: r.id,
          name: r.name,
          cuisineType: r.cuisineType,
          contactEmail: r.contactEmail,
          createdAt: r.createdAt,
          status: r.status,
          emailConfirmedAt: r.emailConfirmedAt ?? null,
          employeeCount,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const unreadNotifications = platform.platformNotifications.filter((n) => !n.read).length;

    return NextResponse.json({
      restaurants,
      notifications: platform.platformNotifications.slice(0, 20),
      stats: {
        total: restaurants.length,
        active: restaurants.filter((r) => r.status === "active").length,
        inactive: restaurants.filter((r) => r.status === "inactive").length,
        pending: restaurants.filter((r) => r.status === "pending").length,
        recent: restaurants.filter((r) => new Date(r.createdAt).getTime() >= recentCutoff).length,
        unreadNotifications,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const id = String(body.id ?? "");
    const status = String(body.status ?? "") as RestaurantStatus;
    if (!id || (status !== "active" && status !== "inactive")) {
      return NextResponse.json({ error: "Identifiant et statut (active/inactive) requis" }, { status: 400 });
    }

    let updated: RestaurantStatus | null = null;
    await updatePlatformDb((platform) => {
      const restaurant = platform.restaurants.find((r) => r.id === id);
      if (!restaurant) throw new Error("NOT_FOUND");
      restaurant.status = status;
      if (status === "active") {
        const tenant = platform.tenants[id];
        for (const user of tenant?.users ?? []) {
          if (user.role === "gerant") {
            user.emailConfirmed = true;
            user.emailConfirmToken = undefined;
            user.emailConfirmTokenExpires = undefined;
          }
        }
        if (!restaurant.emailConfirmedAt) {
          restaurant.emailConfirmedAt = new Date().toISOString();
        }
      }
      updated = status;
      platform.platformNotifications.unshift({
        id: crypto.randomUUID(),
        title: status === "active" ? "Restaurant activé" : "Restaurant désactivé",
        message: `${restaurant.name} est maintenant ${status === "active" ? "actif" : "inactif"}.`,
        read: false,
        createdAt: new Date().toISOString(),
        restaurantId: restaurant.id,
      });
      platform.platformNotifications = platform.platformNotifications.slice(0, 100);
    });

    return NextResponse.json({ ok: true, status: updated });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }
    return apiError(e);
  }
}
