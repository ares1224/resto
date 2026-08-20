import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/seed";
import {
  findUserByEmail,
  updatePlatformDb,
} from "@/lib/db/store";
import { GENERIC_USER_ERROR } from "@/lib/public-error";
import { hashPassword } from "@/lib/password";
import { confirmTokenExpiresAt, sendGerantConfirmation } from "@/lib/signup";
import type { Restaurant, User } from "@/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const restaurantName = String(body.restaurantName ?? "").trim();
  const address = String(body.address ?? "").trim();
  const cuisineType = String(body.cuisineType ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const passwordConfirm = String(body.passwordConfirm ?? "");

  if (!restaurantName || !address || !cuisineType || !phone || !contactEmail) {
    return NextResponse.json(
      { error: "Tous les champs du restaurant sont requis" },
      { status: 400 }
    );
  }
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Tous les champs du gérant sont requis" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email) || !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères" },
      { status: 400 }
    );
  }
  if (password !== passwordConfirm) {
    return NextResponse.json(
      { error: "Les mots de passe ne correspondent pas" },
      { status: 400 }
    );
  }

  const restaurantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();
  const now = new Date().toISOString();
  const gerantName = `${firstName} ${lastName}`;

  const restaurant: Restaurant = {
    id: restaurantId,
    name: restaurantName,
    address,
    cuisineType,
    phone,
    contactEmail,
    status: "pending",
    createdAt: now,
  };

  const confirmToken = crypto.randomUUID();
  const user: User = {
    id: userId,
    email,
    password: hashPassword(password),
    name: gerantName,
    role: "gerant",
    restaurantId,
    employeeId,
    emailConfirmed: false,
    emailConfirmToken: confirmToken,
    emailConfirmTokenExpires: confirmTokenExpiresAt(),
    emailConfirmSentAt: now,
  };

  const tenant = seedDatabase();
  tenant.settings.restaurantName = restaurantName;
  tenant.settings.address = address;
  tenant.settings.cuisineType = cuisineType;
  tenant.settings.setupComplete = true;
  tenant.users.push(user);
  tenant.employees.push({
    id: employeeId,
    firstName,
    lastName,
    role: "Gérant",
    contractType: "CDI",
    hourlyRate: 0,
    weeklyMaxHours: 45,
    phone,
    email,
    startDate: now.split("T")[0],
    documents: [],
    trainings: [],
    hrNotes: "",
    active: true,
  });

  try {
    await updatePlatformDb((platform) => {
      if (findUserByEmail(platform, email)) {
        throw new Error("EMAIL_TAKEN");
      }
      platform.restaurants.push(restaurant);
      platform.tenants[restaurantId] = tenant;
      platform.platformNotifications.unshift({
        id: crypto.randomUUID(),
        title: "Nouveau restaurant inscrit",
        message: `${restaurantName} (${gerantName} — ${email}) vient de s’inscrire. En attente de confirmation d’email.`,
        read: false,
        createdAt: now,
        restaurantId,
      });
      platform.platformNotifications = platform.platformNotifications.slice(0, 100);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      );
    }
    console.error("Signup error:", e);
    return NextResponse.json({ error: GENERIC_USER_ERROR }, { status: 500 });
  }

  const sent = await sendGerantConfirmation(user, restaurantName);
  if (!sent.sent) {
    console.error("Signup confirmation email failed:", sent.error);
  }

  return NextResponse.json({
    ok: true,
    needsConfirmation: true,
  });
}
