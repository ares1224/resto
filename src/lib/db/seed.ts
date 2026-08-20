import type { Database, PlatformDatabase, User } from "@/types";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";
import { hashPassword } from "@/lib/password";

/** Base de données vide d’un restaurant — aucune donnée métier pré-remplie. */
export function seedDatabase(): Database {
  return {
    settings: {
      restaurantName: "",
      covers: 0,
      minRestHours: 11,
      maxWeeklyHours: 48,
      peakSlots: [],
      managerPermissions: { ...DEFAULT_MANAGER_PERMISSIONS },
      sessionTimeoutMinutes: 30,
      setupComplete: true,
      address: "",
      cuisineType: "",
      timezone: "Europe/Paris",
      currency: "EUR",
      locale: "fr",
      setupDraft: null,
    },
    users: [],
    employees: [],
    availabilities: [],
    shiftSlots: [],
    planningPublications: [],
    absences: [],
    replacementOffers: [],
    shiftUnavailabilities: [],
    qrClockTokens: [],
    timeEntries: [],
    suppliers: [],
    stockItems: [],
    stockFieldDefinitions: [],
    priceHistory: [],
    wasteEntries: [],
    ingredients: [],
    menuItems: [],
    recipes: [],
    sales: [],
    cashFlow: [],
    reservations: [],
    haccpChecks: [],
    complianceReminders: [],
    equipment: [],
    shiftLogs: [],
    trafficStats: [],
    shoppingList: [],
    supplierOrderDrafts: [],
    notifications: [],
    auditLog: [],
    gerantAiChats: [],
  };
}

export function defaultSuperAdmin(): User {
  return {
    id: "superadmin-1",
    email: (process.env.SUPERADMIN_EMAIL || "admin@platform.local").trim().toLowerCase(),
    password: hashPassword(process.env.SUPERADMIN_PASSWORD || "ChangeMe123!"),
    name: "Super-admin",
    role: "superadmin",
    emailConfirmed: true,
  };
}

export function seedPlatform(): PlatformDatabase {
  return {
    version: 2,
    restaurants: [],
    superAdmins: [defaultSuperAdmin()],
    tenants: {},
    platformNotifications: [],
    outboundEmails: [],
  };
}

export function isSetupComplete(db: Database): boolean {
  if (db.settings.setupComplete === true) return true;
  return db.users.some((u) => u.role === "gerant");
}
