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

function findEmail(platform: Platform, email: string): boolean {
  if (platform.superAdmins.some((u) => u.email === email)) return true;
  for (const tenant of Object.values(platform.tenants || {})) {
    if ((tenant.users || []).some((u) => u.email === email)) return true;
  }
  return false;
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
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf-8")) as Partial<Platform>;
    if (raw && raw.version === 2 && Array.isArray(raw.superAdmins)) {
      platform = {
        version: 2,
        restaurants: raw.restaurants ?? [],
        superAdmins: raw.superAdmins,
        tenants: raw.tenants ?? {},
        platformNotifications: raw.platformNotifications ?? [],
        outboundEmails: raw.outboundEmails ?? [],
      };
    } else {
      console.error(
        "Le fichier data/restaurant.json n'est pas au format plateforme v2. Lancez une fois `npm run dev`, puis relancez ce script."
      );
      process.exit(1);
    }
  }

  if (findEmail(platform, email)) {
    console.log(`Un compte existe déjà avec l'email ${email}. Aucun super admin n'a été créé.`);
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
