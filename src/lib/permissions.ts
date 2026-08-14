import type { Role, ManagerPermissions } from "@/types";
import type { Session } from "@/lib/auth";

export const MODULES = [
  "dashboard",
  "personnel",
  "stocks",
  "finances",
  "clientele",
  "hygiene",
  "operations",
  "marketing",
  "parametres",
  "mon-espace",
] as const;

export type Module = (typeof MODULES)[number];

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  planning: true,
  stocks: true,
  hygiene: true,
  clientele: true,
  operations: true,
  marketing: true,
  foodCost: true,
};

export type Permission =
  | "view_financial_dashboard"
  | "view_treasury"
  | "view_global_revenue"
  | "export_accounting"
  | "view_all_employees_hr"
  | "edit_planning"
  | "view_team_planning"
  | "view_own_planning"
  | "view_stocks"
  | "edit_stocks"
  | "view_food_cost"
  | "view_clientele"
  | "view_hygiene"
  | "view_operations"
  | "view_marketing"
  | "manage_manager_permissions"
  | "view_audit_log"
  | "view_own_hr"
  | "manage_own_availability"
  | "own_timeclock"
  | "respond_replacement"
  | "view_supplier_prices";

const GERANT_PERMISSIONS: Permission[] = [
  "view_financial_dashboard",
  "view_treasury",
  "view_global_revenue",
  "export_accounting",
  "view_all_employees_hr",
  "edit_planning",
  "view_team_planning",
  "view_stocks",
  "edit_stocks",
  "view_food_cost",
  "view_clientele",
  "view_hygiene",
  "view_operations",
  "view_marketing",
  "manage_manager_permissions",
  "view_audit_log",
  "view_supplier_prices",
];

const EMPLOYE_PERMISSIONS: Permission[] = [
  "view_own_planning",
  "view_own_hr",
  "manage_own_availability",
  "own_timeclock",
  "respond_replacement",
];

function managerPermissionsToList(perms: ManagerPermissions): Permission[] {
  const list: Permission[] = ["view_team_planning", "edit_planning"];
  if (perms.stocks) {
    list.push("view_stocks", "edit_stocks", "view_supplier_prices");
  }
  if (perms.foodCost) list.push("view_food_cost");
  if (perms.clientele) list.push("view_clientele");
  if (perms.hygiene) list.push("view_hygiene");
  if (perms.operations) list.push("view_operations");
  if (perms.marketing) list.push("view_marketing");
  if (perms.planning) {
    // already added
  } else {
    return list.filter((p) => p !== "view_team_planning" && p !== "edit_planning");
  }
  return list;
}

export function hasPermission(
  session: Session,
  permission: Permission,
  managerPerms: ManagerPermissions = DEFAULT_MANAGER_PERMISSIONS
): boolean {
  if (session.role === "gerant") return GERANT_PERMISSIONS.includes(permission);
  if (session.role === "employe") return EMPLOYE_PERMISSIONS.includes(permission);
  return managerPermissionsToList(managerPerms).includes(permission);
}

const MODULE_ACCESS: Record<Role, Module[]> = {
  gerant: [...MODULES],
  manager: ["dashboard", "personnel", "stocks", "clientele", "hygiene", "operations", "marketing"],
  employe: ["dashboard", "personnel", "mon-espace"],
};

export function canAccessModule(
  role: Role,
  module: Module,
  managerPerms: ManagerPermissions = DEFAULT_MANAGER_PERMISSIONS
): boolean {
  if (role === "gerant") return true;
  if (role === "employe") return MODULE_ACCESS.employe.includes(module);
  if (module === "finances") return managerPerms.foodCost;
  if (module === "parametres") return false;
  if (module === "mon-espace") return false;
  if (!MODULE_ACCESS.manager.includes(module)) return false;
  const map: Partial<Record<Module, keyof ManagerPermissions>> = {
    personnel: "planning",
    stocks: "stocks",
    clientele: "clientele",
    hygiene: "hygiene",
    operations: "operations",
    marketing: "marketing",
  };
  const key = map[module];
  return key ? managerPerms[key] : true;
}

/** @deprecated use canAccessModule */
export function canAccess(role: Role, module: Module): boolean {
  return canAccessModule(role, module);
}

export function canManageEmployees(role: Role): boolean {
  return role === "gerant" || role === "manager";
}

export function canViewAllEmployeesHr(role: Role): boolean {
  return role === "gerant";
}

export function canViewFinances(role: Role): boolean {
  return role === "gerant";
}

export function canEditMenu(role: Role): boolean {
  return role === "gerant" || role === "manager";
}

export const RIGHTS_MATRIX: {
  module: string;
  gerant: string;
  manager: string;
  employe: string;
}[] = [
  { module: "Dashboard financier (CA, trésorerie, masse salariale)", gerant: "Complet", manager: "Aucun", employe: "Aucun" },
  { module: "Dashboard opérationnel (alertes stocks, planning)", gerant: "Complet", manager: "Oui", employe: "Personnel uniquement" },
  { module: "Planning équipe", gerant: "Complet", manager: "Oui (configurable)", employe: "Son planning seul" },
  { module: "Fiches RH / salaires / contrats", gerant: "Tous les employés", manager: "Aucun", employe: "Ses données seules" },
  { module: "Stocks & fournisseurs", gerant: "Complet", manager: "Oui (configurable)", employe: "Aucun" },
  { module: "Food cost par plat", gerant: "Complet", manager: "Oui, sans CA global (configurable)", employe: "Aucun" },
  { module: "Trésorerie / export comptable", gerant: "Complet", manager: "Aucun", employe: "Aucun" },
  { module: "Réservations", gerant: "Complet", manager: "Oui (configurable)", employe: "Aucun" },
  { module: "Hygiène HACCP", gerant: "Complet", manager: "Oui (configurable)", employe: "Aucun" },
  { module: "Opérationnel / carte / maintenance", gerant: "Complet", manager: "Oui (configurable)", employe: "Aucun" },
  { module: "Marketing", gerant: "Complet", manager: "Oui (configurable)", employe: "Aucun" },
  { module: "Journal d'audit", gerant: "Consultation", manager: "Aucun", employe: "Aucun" },
  { module: "Paramétrage droits manager", gerant: "Modification", manager: "Aucun", employe: "Aucun" },
  { module: "Données personnelles RGPD", gerant: "Gestion globale", manager: "Aucun", employe: "Consultation propres données" },
];
