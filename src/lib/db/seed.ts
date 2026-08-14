import type { Database } from "@/types";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/lib/permissions";

/** Base de données vide — aucune donnée métier pré-remplie. */
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

export function isSetupComplete(db: Database): boolean {
  return db.users.some((u) => u.role === "gerant");
}
