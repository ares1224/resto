import { promises as fs } from "fs";
import path from "path";
import type { Database } from "@/types";
import { seedDatabase } from "./seed";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";

// En local : data/ à la racine du projet. Sur Vercel le disque est en lecture
// seule hors /tmp, donc on y écrit une base éphémère (recréée à chaque cold start).
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "bistrot-data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "restaurant.json");

let cache: Database | null = null;
let cacheMtimeMs = 0;

function migrateDb(db: Database): Database {
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
    // Avant l'introduction de la validation, tous les créneaux étaient visibles
    // par les employés : on considère les semaines existantes comme publiées
    // pour ne rien faire disparaître de leur espace.
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
  db.reservations = (db.reservations ?? []).map(({ guestName, guestPhone, guestEmail, date, time, covers, status, reminderSent, notes, id }) => ({
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
  }));
  db.notifications = (db.notifications ?? []).filter((n) => (n.type as string) !== "review");

  return db;
}

function weekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const seed = seedDatabase();
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}

async function readDbFromDisk(): Promise<Database> {
  await ensureDataFile();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const raw = await fs.readFile(DATA_FILE, "utf-8");
      if (!raw.trim()) throw new SyntaxError("empty file");
      return migrateDb(JSON.parse(raw) as Database);
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

export async function getDb(): Promise<Database> {
  const mtime = await getFileMtime();
  if (cache && mtime === cacheMtimeMs) return cache;
  cache = await readDbFromDisk();
  cacheMtimeMs = mtime;
  return cache;
}

export async function saveDb(db: Database): Promise<void> {
  cache = db;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const content = JSON.stringify(db, null, 2);
  const tmp = path.join(DATA_DIR, `restaurant.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, content, "utf-8");

  // Sous Windows le rename atomique échoue (EPERM) quand un antivirus ou un
  // watcher garde le fichier ouvert : on réessaie, puis on écrit sur place.
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

export async function updateDb(updater: (db: Database) => void): Promise<Database> {
  const db = await readDbFromDisk();
  updater(db);
  await saveDb(db);
  return db;
}

export function resetCache(): void {
  cache = null;
  cacheMtimeMs = 0;
}
