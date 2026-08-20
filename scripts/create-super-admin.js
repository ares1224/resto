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
 *   node scripts/create-super-admin.js
 *   npm run create-super-admin
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Remplacez ces placeholders avant d'exécuter le script
const SUPER_ADMIN_EMAIL = "SUPER_ADMIN_EMAIL";
const SUPER_ADMIN_PASSWORD = "SUPER_ADMIN_PASSWORD";
// ---------------------------------------------------------------------------

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function emptyPlatform() {
  return {
    version: 2,
    restaurants: [],
    superAdmins: [],
    tenants: {},
    platformNotifications: [],
    outboundEmails: [],
  };
}

function toPlatform(raw) {
  if (raw && raw.version === 2 && typeof raw.tenants === "object" && raw.tenants) {
    if (!Array.isArray(raw.superAdmins)) raw.superAdmins = [];
    if (!Array.isArray(raw.restaurants)) raw.restaurants = [];
    if (!Array.isArray(raw.platformNotifications)) raw.platformNotifications = [];
    if (!Array.isArray(raw.outboundEmails)) raw.outboundEmails = [];
    return raw;
  }

  const tenant = raw && typeof raw === "object" ? raw : {};
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
        name: (tenant.settings && tenant.settings.restaurantName) || "Restaurant existant",
        address: (tenant.settings && tenant.settings.address) || "",
        cuisineType: (tenant.settings && tenant.settings.cuisineType) || "",
        phone: "",
        contactEmail: (gerant && gerant.email) || "",
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

function findSuperAdmin(platform, email) {
  return (platform.superAdmins || []).some((u) => u.email === email);
}

function main() {
  const email = String(SUPER_ADMIN_EMAIL).trim().toLowerCase();
  const password = String(SUPER_ADMIN_PASSWORD);

  if (!email || email === "super_admin_email" || email === "SUPER_ADMIN_EMAIL") {
    console.error(
      "Remplacez SUPER_ADMIN_EMAIL dans scripts/create-super-admin.js par l'email réel, puis relancez."
    );
    process.exit(1);
  }
  if (!password || password === "SUPER_ADMIN_PASSWORD") {
    console.error(
      "Remplacez SUPER_ADMIN_PASSWORD dans scripts/create-super-admin.js par le mot de passe réel, puis relancez."
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

  let platform;
  if (!fs.existsSync(dataFile)) {
    platform = emptyPlatform();
  } else {
    platform = toPlatform(JSON.parse(fs.readFileSync(dataFile, "utf-8")));
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
