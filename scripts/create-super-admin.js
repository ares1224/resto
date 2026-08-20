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

function findEmail(platform, email) {
  if ((platform.superAdmins || []).some((u) => u.email === email)) return true;
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
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    if (raw && raw.version === 2 && Array.isArray(raw.superAdmins)) {
      platform = raw;
    } else {
      console.error(
        "Le fichier data/restaurant.json n'est pas au format plateforme v2. Lancez une fois `npm run dev`, puis relancez ce script."
      );
      process.exit(1);
    }
  }

  if (!Array.isArray(platform.superAdmins)) platform.superAdmins = [];

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
