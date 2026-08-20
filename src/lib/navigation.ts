import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Package,
  Wallet,
  UserCircle,
  ShieldCheck,
  Wrench,
  Megaphone,
  Settings,
  User,
  Sparkles,
  KeyRound,
  Calendar,
  Clock,
} from "lucide-react";
import type { Session } from "@/lib/auth";
import type { ManagerPermissions } from "@/types";
import { canAccessModule } from "@/lib/permissions";

export type NavLink = { href: string; label: string };

export type NavEntry =
  | { type: "link"; href: string; label: string; icon: LucideIcon }
  | { type: "group"; id: string; label: string; icon: LucideIcon; children: NavLink[] };

const GERANT_NAV: NavEntry[] = [
  { type: "link", href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  {
    type: "group",
    id: "personnel",
    label: "Équipe",
    icon: Users,
    children: [
      { href: "/personnel/planning", label: "Planning" },
      { href: "/personnel/disponibilites", label: "Disponibilités" },
      { href: "/personnel/pointage", label: "Pointage" },
      { href: "/personnel/remplacements", label: "Remplacements" },
      { href: "/personnel/employes", label: "Fiches employés" },
    ],
  },
  {
    type: "group",
    id: "stocks",
    label: "Stocks",
    icon: Package,
    children: [
      { href: "/stocks/inventaire", label: "Inventaire" },
      { href: "/stocks/fournisseurs", label: "Fournisseurs" },
      { href: "/stocks/commandes", label: "Commandes fournisseurs" },
      { href: "/stocks/courses", label: "Liste de courses" },
      { href: "/stocks/gaspillage", label: "Gaspillage" },
    ],
  },
  {
    type: "group",
    id: "finances",
    label: "Finances",
    icon: Wallet,
    children: [
      { href: "/finances/tresorerie", label: "Trésorerie" },
      { href: "/finances/food-cost", label: "Coût des plats" },
      { href: "/finances/simulateur", label: "Simulateur de prix" },
      { href: "/finances/export", label: "Export comptable" },
    ],
  },
  {
    type: "link",
    href: "/clientele/reservations",
    label: "Réservations",
    icon: UserCircle,
  },
  {
    type: "group",
    id: "hygiene",
    label: "Hygiène",
    icon: ShieldCheck,
    children: [
      { href: "/hygiene/checklists", label: "Checklists HACCP" },
      { href: "/hygiene/registre", label: "Registre" },
      { href: "/hygiene/allergenes", label: "Allergènes" },
    ],
  },
  {
    type: "group",
    id: "operations",
    label: "Opérationnel",
    icon: Wrench,
    children: [
      { href: "/operations/maintenance", label: "Maintenance" },
      { href: "/operations/menu", label: "Carte & menu" },
      { href: "/operations/main-courante", label: "Main courante" },
    ],
  },
  {
    type: "group",
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    children: [
      { href: "/marketing/frequentation", label: "Fréquentation" },
    ],
  },
  {
    type: "group",
    id: "assistant-ia",
    label: "Assistant IA",
    icon: Sparkles,
    children: [
      { href: "/assistant-ia/chat", label: "Agent conversationnel" },
      { href: "/assistant-ia/planning", label: "Génération automatique du planning" },
      { href: "/assistant-ia/previsions", label: "Prévision de fréquentation" },
      { href: "/assistant-ia/anomalies", label: "Anomalies détectées" },
      { href: "/assistant-ia/commandes", label: "Aide aux commandes fournisseurs" },
    ],
  },
  {
    type: "group",
    id: "parametres",
    label: "Paramètres",
    icon: Settings,
    children: [
      { href: "/parametres/droits", label: "Droits manager" },
      { href: "/parametres/audit", label: "Historique des actions" },
    ],
  },
];

const EMPLOYE_NAV: NavEntry[] = [
  { type: "link", href: "/dashboard", label: "Accueil", icon: User },
  { type: "link", href: "/personnel/planning", label: "Mes horaires", icon: LayoutDashboard },
  { type: "link", href: "/personnel/disponibilites", label: "Disponibilités", icon: Calendar },
  { type: "link", href: "/personnel/pointage", label: "Pointer", icon: Clock },
  { type: "link", href: "/personnel/remplacements", label: "Remplacements", icon: Users },
  { type: "link", href: "/mon-espace/donnees", label: "Mes informations", icon: ShieldCheck },
  { type: "link", href: "/mon-espace/mot-de-passe", label: "Mot de passe", icon: KeyRound },
];

export function getNavigation(role: Session["role"], perms: ManagerPermissions): NavEntry[] {
  if (role === "superadmin") {
    return [{ type: "link", href: "/admin", label: "Plateforme", icon: LayoutDashboard }];
  }
  if (role === "employe") return EMPLOYE_NAV;
  if (role === "gerant") return GERANT_NAV;

  const entries: NavEntry[] = [{ type: "link", href: "/dashboard", label: "Accueil", icon: LayoutDashboard }];

  if (canAccessModule("manager", "personnel", perms)) {
    entries.push({
      type: "group",
      id: "personnel",
      label: "Équipe",
      icon: Users,
      children: [
        { href: "/personnel/planning", label: "Planning" },
        { href: "/personnel/disponibilites", label: "Disponibilités" },
        { href: "/personnel/pointage", label: "Pointage" },
        { href: "/personnel/remplacements", label: "Remplacements" },
      ],
    });
  }

  if (canAccessModule("manager", "stocks", perms)) {
    entries.push({
      type: "group",
      id: "stocks",
      label: "Stocks",
      icon: Package,
      children: [
        { href: "/stocks/inventaire", label: "Inventaire" },
        { href: "/stocks/fournisseurs", label: "Fournisseurs" },
        { href: "/stocks/commandes", label: "Commandes fournisseurs" },
        { href: "/stocks/courses", label: "Liste de courses" },
        { href: "/stocks/gaspillage", label: "Gaspillage" },
      ],
    });
  }

  if (perms.foodCost) {
    entries.push({
      type: "link",
      href: "/finances/food-cost",
      label: "Coût des plats",
      icon: Wallet,
    });
  }

  if (canAccessModule("manager", "clientele", perms)) {
    entries.push({
      type: "link",
      href: "/clientele/reservations",
      label: "Réservations",
      icon: UserCircle,
    });
  }

  if (canAccessModule("manager", "hygiene", perms)) {
    entries.push({
      type: "group",
      id: "hygiene",
      label: "Hygiène",
      icon: ShieldCheck,
      children: [
        { href: "/hygiene/checklists", label: "Checklists HACCP" },
        { href: "/hygiene/registre", label: "Registre" },
      ],
    });
  }

  if (canAccessModule("manager", "operations", perms)) {
    entries.push({
      type: "group",
      id: "operations",
      label: "Opérationnel",
      icon: Wrench,
      children: [
        { href: "/operations/maintenance", label: "Maintenance" },
        { href: "/operations/menu", label: "Carte & menu" },
      ],
    });
  }

  if (canAccessModule("manager", "marketing", perms)) {
    entries.push({
      type: "group",
      id: "marketing",
      label: "Marketing",
      icon: Megaphone,
      children: [
        { href: "/marketing/frequentation", label: "Fréquentation" },
      ],
    });
  }

  return entries;
}

export function isNavLinkActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavGroupActive(entry: Extract<NavEntry, { type: "group" }>, pathname: string): boolean {
  return entry.children.some((child) => isNavLinkActive(child.href, pathname));
}

export function findActiveGroupIds(entries: NavEntry[], pathname: string): string[] {
  return entries
    .filter((e): e is Extract<NavEntry, { type: "group" }> => e.type === "group")
    .filter((g) => isNavGroupActive(g, pathname))
    .map((g) => g.id);
}
