import type { Database } from "@/types";

export type CompletenessItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

/** Points essentiels à renseigner après la config initiale — le gérant, lui, ne compte pas. */
export function getSetupCompleteness(db: Database): CompletenessItem[] {
  const staff = db.employees.filter((e) => e.role !== "Gérant" && e.active);
  return [
    {
      id: "employees",
      label: "Ajouter des employés",
      href: "/personnel/employes",
      done: staff.length > 0,
    },
    {
      id: "suppliers",
      label: "Configurer les fournisseurs",
      href: "/stocks/fournisseurs",
      done: db.suppliers.length > 0,
    },
    {
      id: "menu",
      label: "Créer un premier plat",
      href: "/operations/menu",
      done: db.menuItems.length > 0,
    },
    {
      id: "stocks",
      label: "Renseigner l'inventaire",
      href: "/stocks/inventaire",
      done: db.stockItems.length > 0,
    },
  ];
}
