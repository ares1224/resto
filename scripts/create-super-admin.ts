/**
 * Crée un compte super-admin dans data/restaurant.json (base locale).
 *
 * AVANT D'EXÉCUTER, remplacez les deux constantes ci-dessous :
 *   SUPER_ADMIN_EMAIL     → l'email de connexion réel
 *   SUPER_ADMIN_PASSWORD  → le mot de passe réel
 *
 * Le rôle enregistré est `superadmin` (rôle plateforme de l'application).
 * Le mot de passe est stocké hashé (scrypt), jamais en clair.
 *
 * Exécution :
 *   npx ts-node scripts/create-super-admin.ts
 *   node scripts/create-super-admin.js
 *   npm run create-super-admin
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Remplacez ces placeholders avant d'exécuter le script
const SUPER_ADMIN_EMAIL = "SUPER_ADMIN_EMAIL";
const SUPER_ADMIN_PASSWORD = "SUPER_ADMIN_PASSWORD";
// ---------------------------------------------------------------------------

type SuperAdmin = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "superadmin";
  emailConfirmed: true;
};

type Platform = {
  version: 2;
  restaurants: unknown[];
  superAdmins: SuperAdmin[];
  tenants: Record<string, { users?: { email: string }[] }>;
  platformNotifications: unknown[];
  outboundEmails: unknown[];
};

function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function emptyPlatform(): Platform {
  return {
    version: 2,
    restaurants: [],
    superAdmins: [],
    tenants: {},
    platformNotifications: [],
    outboundEmails: [],
  };
}

function toPlatform(raw: Record<string, unknown>): Platform {
  if (raw && raw.version === 2 && raw.tenants && typeof raw.tenants === "object") {
    return {
      version: 2,
      restaurants: (raw.restaurants as Platform["restaurants"]) ?? [],
      superAdmins: (raw.superAdmins as SuperAdmin[]) ?? [],
      tenants: (raw.tenants as Platform["tenants"]) ?? {},
      platformNotifications: (raw.platformNotifications as unknown[]) ?? [],
      outboundEmails: (raw.outboundEmails as unknown[]) ?? [],
    };
  }

  const tenant = raw as { settings?: { restaurantName?: string; address?: string; cuisineType?: string }; users?: { email?: string; role?: string; restaurantId?: string; emailConfirmed?: boolean }[] };
  if (!Array.isArray(tenant.users)) tenant.users = [];
  const id = crypto.randomUUID();
  const gerant = tenant.users.find((u) => u.role === "gerant");
  for (const user of tenant.users) {
    user.restaurantId = id;
    if (user.emailConfirmed === undefined) user.emailConfirmed = true;
  }

  return {
    version: 2,
    restaurants: [
      {
        id,
        name: tenant.settings?.restaurantName || "Restaurant existant",
        address: tenant.settings?.address || "",
        cuisineType: tenant.settings?.cuisineType || "",
        phone: "",
        contactEmail: gerant?.email || "",
        status: "active",
        createdAt: new Date().toISOString(),
        emailConfirmedAt: new Date().toISOString(),
      },
    ],
    superAdmins: [],
    tenants: { [id]: tenant },
    platformNotifications: [],
    outboundEmails: [],
  };
}

function findSuperAdmin(platform: Platform, email: string): boolean {
  return platform.superAdmins.some((u) => u.email === email);
}

function main() {
  const email = String(SUPER_ADMIN_EMAIL).trim().toLowerCase();
  const password = String(SUPER_ADMIN_PASSWORD);

  if (!email || email === "super_admin_email" || email === "SUPER_ADMIN_EMAIL") {
    console.error(
      "Remplacez SUPER_ADMIN_EMAIL dans scripts/create-super-admin.ts par l'email réel, puis relancez."
    );
    process.exit(1);
  }
  if (!password || password === "SUPER_ADMIN_PASSWORD") {
    console.error(
      "Remplacez SUPER_ADMIN_PASSWORD dans scripts/create-super-admin.ts par le mot de passe réel, puis relancez."
    );
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Le mot de passe doit contenir au moins 6 caractères.");
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "data");
  const dataFile = path.join(dataDir, "restaurant.json");
  fs.mkdirSync(dataDir, { recursive: true });

  let platform: Platform;
  if (!fs.existsSync(dataFile)) {
    platform = emptyPlatform();
  } else {
    platform = toPlatform(JSON.parse(fs.readFileSync(dataFile, "utf-8")) as Record<string, unknown>);
  }

  if (findSuperAdmin(platform, email)) {
    console.log(`Un super admin existe déjà avec l'email ${email}. Aucun compte n'a été créé.`);
    process.exit(0);
  }

  platform.superAdmins.push({
    id: crypto.randomUUID(),
    email,
    password: hashPassword(password),
    name: "Super-admin",
    role: "superadmin",
    emailConfirmed: true,
  });

  fs.writeFileSync(dataFile, JSON.stringify(platform, null, 2), "utf-8");
  console.log(`Super admin créé avec succès : ${email}`);
  console.log("Connectez-vous sur /login puis vous serez redirigé vers /admin.");
}

main();
