import { AlertTriangle, Package, Users, Calendar, ClipboardList } from "lucide-react";
import type { Database } from "@/types";
import { getManagerPermissions } from "@/lib/page-guard";
import { canAccessModule } from "@/lib/permissions";
import { BigActionButton } from "@/components/ui/BigActionButton";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export async function ManagerDashboard({ db }: { db: Database }) {
  const perms = await getManagerPermissions();
  const today = new Date().toISOString().split("T")[0];
  const alerts = db.notifications
    .filter((n) => !n.read && n.targetRoles.includes("manager"))
    .slice(0, 5);
  const lowStock = db.stockItems.filter((s) => s.quantity <= s.minThreshold).length;
  const staffingAlerts = db.notifications.filter((n) => n.type === "staffing" && !n.read).length;
  const pendingHaccp = db.haccpChecks.filter((c) => !c.completed && c.date === today).length;
  const todayReservations = db.reservations.filter(
    (r) => r.status === "confirmed" && r.date === today
  ).length;
  const remindersDue = db.reservations.filter(
    (r) => r.status === "confirmed" && !r.reminderSent
  ).length;

  const dailyActions = [
    {
      href: "/personnel/planning",
      label: "Planning de l'équipe",
      description: "Voir et ajuster les horaires",
      icon: Calendar,
      module: "personnel" as const,
    },
    {
      href: "/stocks/inventaire",
      label: "Vérifier les stocks",
      description: "Produits sous le seuil",
      icon: Package,
      module: "stocks" as const,
    },
    {
      href: "/clientele/reservations",
      label: "Réservations du jour",
      description: "Couverts attendus",
      icon: ClipboardList,
      module: "clientele" as const,
    },
    {
      href: "/hygiene/checklists",
      label: "Contrôles hygiène",
      description: "Checklists du jour",
      icon: AlertTriangle,
      module: "hygiene" as const,
    },
  ].filter((a) => canAccessModule("manager", a.module, perms));

  const todoItems = [
    lowStock > 0 && canAccessModule("manager", "stocks", perms)
      ? {
          label: `${lowStock} produit${lowStock > 1 ? "s" : ""} en stock bas`,
          href: "/stocks/inventaire",
          urgent: true,
        }
      : null,
    pendingHaccp > 0 && canAccessModule("manager", "hygiene", perms)
      ? {
          label: `${pendingHaccp} contrôle${pendingHaccp > 1 ? "s" : ""} hygiène à faire`,
          href: "/hygiene/checklists",
          urgent: true,
        }
      : null,
    remindersDue > 0 && canAccessModule("manager", "clientele", perms)
      ? {
          label: `${remindersDue} rappel${remindersDue > 1 ? "s" : ""} réservation à envoyer`,
          href: "/clientele/reservations",
          urgent: false,
        }
      : null,
    staffingAlerts > 0 && canAccessModule("manager", "personnel", perms)
      ? {
          label: `${staffingAlerts} alerte${staffingAlerts > 1 ? "s" : ""} effectif`,
          href: "/personnel/planning",
          urgent: false,
        }
      : null,
  ].filter(Boolean) as { label: string; href: string; urgent: boolean }[];

  const kpis = [
    canAccessModule("manager", "stocks", perms) && {
      label: "Stocks bas",
      value: lowStock,
      icon: Package,
      tone: "blue" as const,
    },
    canAccessModule("manager", "personnel", perms) && {
      label: "Alertes équipe",
      value: staffingAlerts,
      icon: Users,
      tone: "blue" as const,
    },
    canAccessModule("manager", "clientele", perms) && {
      label: "Réservations",
      value: todayReservations,
      icon: ClipboardList,
      tone: "green" as const,
    },
    canAccessModule("manager", "hygiene", perms) && {
      label: "Hygiène à faire",
      value: pendingHaccp,
      icon: AlertTriangle,
      tone: "orange" as const,
    },
  ].filter(Boolean) as {
    label: string;
    value: number;
    icon: typeof Package;
    tone: "blue" | "green" | "orange";
  }[];

  const tones = {
    blue: "bg-[#EEF2FF] text-[#1B3AE8]",
    green: "bg-[#D1FAE5] text-[#047857]",
    orange: "bg-[#FEF3C7] text-[#B45309]",
  };

  return (
    <div data-onboarding="dashboard-welcome">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1A1D23]">Bonjour</h1>
        <p className="page-subtitle mt-1 flex items-center gap-2">
          Voici ce qui compte aujourd&apos;hui
          <HelpTooltip text="Les éléments urgents et vos actions les plus fréquentes sont affichés en premier." />
        </p>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card-surface p-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[kpi.tone]}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <p className="kpi-label mt-3">{kpi.label}</p>
              <p className="kpi-value mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card-surface mt-3 p-4">
        <h3 className="mb-2 text-[15px] font-bold text-[#1A1D23]">À traiter en priorité</h3>
        {todoItems.length === 0 ? (
          <p className="text-[14px] text-[#10B981]">Rien d&apos;urgent pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#ECEEF3]">
            {todoItems.map((item) => (
              <li key={item.href + item.label}>
                <Link href={item.href} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-[14px] font-medium text-[#1A1D23]">{item.label}</span>
                  <Badge variant={item.urgent ? "danger" : "warning"}>
                    {item.urgent ? "Urgent" : "À voir"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3" data-onboarding="manager-daily">
        <h2 className="section-label mb-3">Actions du quotidien</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {dailyActions.map((action) => (
            <BigActionButton
              key={action.href}
              href={action.href}
              label={action.label}
              description={action.description}
              icon={action.icon}
              variant="secondary"
            />
          ))}
        </div>
      </div>

      {alerts.length > 0 && (
        <details className="card-surface mt-3">
          <summary className="cursor-pointer px-4 py-4 text-[14px] font-semibold text-[#1A1D23]">
            Toutes les alertes ({alerts.length})
          </summary>
          <ul className="divide-y divide-[#ECEEF3] px-4 pb-4">
            {alerts.map((a) => (
              <li key={a.id} className="py-3">
                <span className="section-label">{a.type}</span>
                <p className="mt-1 text-[14px] font-semibold text-[#1A1D23]">{a.title}</p>
                <p className="text-[12px] text-[#6B7280]">{a.message}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
