import { promises as fs } from "fs";
import path from "path";
import type { Database, PlatformDatabase, Restaurant, User } from "@/types";
import { defaultSuperAdmin, seedDatabase, seedPlatform } from "./seed";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";
import { readBlobJson, useBlobStorage, writeBlobJson } from "./persistence";

// En local : data/ à la racine du projet.
// Sur Vercel : Vercel Blob (privé). /tmp n’est pas partagé entre instances.
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "bistrot-data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "restaurant.json");

let cache: PlatformDatabase | null = null;
let cacheMtimeMs = 0;

export class TenantError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "TenantError";
    this.status = status;
  }
}

function migrateTenant(db: Database): Database {
  if (!db.auditLog) db.auditLog = [];
  if (!db.shiftUnavailabilities) db.shiftUnavailabilities = [];
  if (!db.qrClockTokens) db.qrClockTokens = [];
  if (!db.settings.managerPermissions) {
    db.settings.managerPermissions = DEFAULT_MANAGER_PERMISSIONS;
  }
  if (!db.settings.sessionTimeoutMinutes) {
    db.settings.sessionTimeoutMinutes = 30;
  }
  if (db.settings.setupComplete === undefined) {
    db.settings.setupComplete = db.users.some((u) => u.role === "gerant");
  }
  if (db.settings.address === undefined) db.settings.address = "";
  if (db.settings.cuisineType === undefined) db.settings.cuisineType = "";
  if (!db.settings.timezone) db.settings.timezone = "Europe/Paris";
  if (!db.settings.currency) db.settings.currency = "EUR";
  if (!db.settings.locale) db.settings.locale = "fr";
  if (db.settings.setupDraft === undefined) db.settings.setupDraft = null;
  if (!db.gerantAiChats) db.gerantAiChats = [];
  if (!db.planningPublications) {
    const weeks = [...new Set((db.shiftSlots ?? []).map((s) => s.weekStart))];
    db.planningPublications = weeks.map((weekStart) => ({
      weekStart,
      publishedAt: new Date().toISOString(),
      publishedByUserId: "",
    }));
  }
  if (!db.stockFieldDefinitions) db.stockFieldDefinitions = [];
  if (!db.supplierOrderDrafts) db.supplierOrderDrafts = [];
  for (const item of db.stockItems ?? []) {
    if (!item.customFields) item.customFields = {};
  }
  if (db.settings.covers === 30 && db.settings.restaurantName === "Le Petit Zinc") {
    db.settings.covers = 0;
    db.settings.restaurantName = "";
  }
  db.replacementOffers = (db.replacementOffers ?? []).map((o) => {
    if ("targetEmployeeId" in o) return o as Database["replacementOffers"][0];
    const legacy = o as unknown as { employeeId: string; absenceId: string };
    return {
      id: (o as { id: string }).id,
      shiftSlotId: "s3",
      targetEmployeeId: legacy.employeeId,
      sentByUserId: "u1",
      status: (o as { status: "pending" | "accepted" | "declined" }).status,
      notifiedAt: (o as { notifiedAt: string }).notifiedAt,
      weekStart: weekStartIso(),
      dayOfWeek: 1,
      startTime: "11:00",
      endTime: "15:00",
      roleLabel: "Serveur",
    };
  });

  const legacy = db as Database & {
    clients?: unknown;
    reviews?: unknown;
    socialPosts?: unknown;
    deliveryOrders?: unknown;
  };
  delete legacy.clients;
  delete legacy.reviews;
  delete legacy.socialPosts;
  delete legacy.deliveryOrders;
  db.reservations = (db.reservations ?? []).map(
    ({ guestName, guestPhone, guestEmail, date, time, covers, status, reminderSent, notes, id }) => ({
      id,
      guestName,
      guestPhone,
      guestEmail,
      date,
      time,
      covers,
      status,
      reminderSent,
      notes,
    })
  );
  db.notifications = (db.notifications ?? []).filter((n) => (n.type as string) !== "review");

  return db;
}

function weekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function isPlatformShape(raw: unknown): raw is PlatformDatabase {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as { version?: unknown; tenants?: unknown };
  return obj.version === 2 && !!obj.tenants && typeof obj.tenants === "object";
}

function isLegacyEmpty(db: Database): boolean {
  return (
    db.users.length === 0 &&
    !db.settings.setupComplete &&
    !(db.settings.restaurantName || "").trim()
  );
}

function migrateToPlatform(raw: unknown): { platform: PlatformDatabase; migrated: boolean } {
  if (isPlatformShape(raw)) {
    const platform = raw;
    let migrated = false;
    if (!platform.restaurants) {
      platform.restaurants = [];
      migrated = true;
    }
    if (!platform.tenants) {
      platform.tenants = {};
      migrated = true;
    }
    if (!platform.platformNotifications) {
      platform.platformNotifications = [];
      migrated = true;
    }
    if (!platform.outboundEmails) {
      platform.outboundEmails = [];
      migrated = true;
    }
    if (!platform.superAdmins || platform.superAdmins.length === 0) {
      platform.superAdmins = [defaultSuperAdmin()];
      migrated = true;
    }
    for (const id of Object.keys(platform.tenants)) {
      platform.tenants[id] = migrateTenant(platform.tenants[id] ?? seedDatabase());
    }
    return { platform, migrated };
  }

  const tenant = migrateTenant((raw ?? seedDatabase()) as Database);
  if (isLegacyEmpty(tenant)) {
    return { platform: seedPlatform(), migrated: true };
  }

  const id = crypto.randomUUID();
  const gerant = tenant.users.find((u) => u.role === "gerant");
  for (const user of tenant.users) {
    user.restaurantId = id;
    user.emailConfirmed = true;
  }
  const restaurant: Restaurant = {
    id,
    name: tenant.settings.restaurantName || "Restaurant existant",
    address: tenant.settings.address || "",
    cuisineType: tenant.settings.cuisineType || "",
    phone: "",
    contactEmail: gerant?.email || "",
    status: "active",
    createdAt: new Date().toISOString(),
    emailConfirmedAt: new Date().toISOString(),
  };

  return {
    platform: {
      version: 2,
      restaurants: [restaurant],
      superAdmins: [defaultSuperAdmin()],
      tenants: { [id]: tenant },
      platformNotifications: [],
      outboundEmails: [],
    },
    migrated: true,
  };
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(seedPlatform(), null, 2), "utf-8");
  }
}

async function savePlatform(db: PlatformDatabase): Promise<void> {
  cache = db;
  const content = JSON.stringify(db, null, 2);
  if (useBlobStorage()) {
    await writeBlobJson(content);
    cacheMtimeMs = Date.now();
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = path.join(DATA_DIR, `restaurant.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, content, "utf-8");

  let renamed = false;
  for (let attempt = 0; attempt < 5 && !renamed; attempt++) {
    try {
      await fs.rename(tmp, DATA_FILE);
      renamed = true;
    } catch {
      await new Promise((r) => setTimeout(r, 30 * (attempt + 1)));
    }
  }
  if (!renamed) {
    await fs.writeFile(DATA_FILE, content, "utf-8");
    await fs.rm(tmp, { force: true });
  }

  cacheMtimeMs = await getFileMtime();
}

async function readPlatformFromDisk(): Promise<PlatformDatabase> {
  if (useBlobStorage()) {
    const raw = await readBlobJson();
    if (!raw) {
      const platform = seedPlatform();
      await savePlatform(platform);
      return platform;
    }
    const { platform, migrated } = migrateToPlatform(JSON.parse(raw));
    if (migrated) await savePlatform(platform);
    return platform;
  }

  await ensureDataFile();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      if (!raw.trim()) throw new SyntaxError("empty file");
      const { platform, migrated } = migrateToPlatform(JSON.parse(raw));
      if (migrated) await savePlatform(platform);
      return platform;
    } catch (e) {
      lastError = e;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function getFileMtime(): Promise<number> {
  try {
    const stat = await fs.stat(DATA_FILE);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

export function findUserInPlatform(platform: PlatformDatabase, userId: string): User | undefined {
  const admin = platform.superAdmins.find((u) => u.id === userId);
  if (admin) return admin;
  for (const tenant of Object.values(platform.tenants)) {
    const user = tenant.users.find((u) => u.id === userId);
    if (user) return user;
  }
  return undefined;
}

export function findUserByEmail(
  platform: PlatformDatabase,
  email: string
): { user: User; restaurantId?: string } | undefined {
  const normalized = email.trim().toLowerCase();
  const admin = platform.superAdmins.find((u) => u.email === normalized);
  if (admin) return { user: admin };
  for (const [restaurantId, tenant] of Object.entries(platform.tenants)) {
    const user = tenant.users.find((u) => u.email === normalized);
    if (user) return { user, restaurantId };
  }
  return undefined;
}

export function findUserByPasswordSetupToken(
  platform: PlatformDatabase,
  token: string
): { user: User; restaurantId: string } | undefined {
  for (const [restaurantId, tenant] of Object.entries(platform.tenants)) {
    const user = tenant.users.find((u) => u.passwordSetupToken === token);
    if (user) return { user, restaurantId };
  }
  return undefined;
}

export function findUserByConfirmToken(
  platform: PlatformDatabase,
  token: string
): { user: User; restaurantId: string } | undefined {
  for (const [restaurantId, tenant] of Object.entries(platform.tenants)) {
    const user = tenant.users.find((u) => u.emailConfirmToken === token);
    if (user) return { user, restaurantId };
  }
  return undefined;
}

export async function getPlatformDb(): Promise<PlatformDatabase> {
  if (useBlobStorage()) {
    cache = await readPlatformFromDisk();
    cacheMtimeMs = Date.now();
    return cache;
  }
  const mtime = await getFileMtime();
  if (cache && mtime === cacheMtimeMs) return cache;
  cache = await readPlatformFromDisk();
  cacheMtimeMs = mtime;
  return cache;
}

export async function updatePlatformDb(
  updater: (db: PlatformDatabase) => void
): Promise<PlatformDatabase> {
  const db = await readPlatformFromDisk();
  updater(db);
  await savePlatform(db);
  return db;
}

export async function getTenantDb(restaurantId: string): Promise<Database> {
  const platform = await getPlatformDb();
  const tenant = platform.tenants[restaurantId];
  if (!tenant) throw new TenantError("Restaurant introuvable", 404);
  return tenant;
}

export async function updateTenantDb(
  restaurantId: string,
  updater: (db: Database) => void
): Promise<Database> {
  const platform = await updatePlatformDb((p) => {
    const tenant = p.tenants[restaurantId];
    if (!tenant) throw new TenantError("Restaurant introuvable", 404);
    updater(tenant);
  });
  return platform.tenants[restaurantId];
}

async function requireTenantId(): Promise<string> {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) throw new TenantError("Unauthorized", 401);
  if (session.role === "superadmin") {
    throw new TenantError("Espace restaurant requis", 403);
  }

  const platform = await getPlatformDb();
  const user = findUserInPlatform(platform, session.userId);
  if (!user || user.role === "superadmin" || !user.restaurantId) {
    throw new TenantError("Unauthorized", 401);
  }

  const restaurant = platform.restaurants.find((r) => r.id === user.restaurantId);
  if (!restaurant) throw new TenantError("Restaurant introuvable", 403);
  if (restaurant.status === "inactive") {
    throw new TenantError("Restaurant inactif", 403);
  }

  return user.restaurantId;
}

export async function getRequestTenantId(): Promise<string> {
  return requireTenantId();
}

/** Base du restaurant de l’utilisateur connecté — isolation serveur, pas le cookie. */
export async function getDb(): Promise<Database> {
  return getTenantDb(await requireTenantId());
}

export async function updateDb(updater: (db: Database) => void): Promise<Database> {
  return updateTenantDb(await requireTenantId(), updater);
}

export function resetCache(): void {
  cache = null;
  cacheMtimeMs = 0;
}
