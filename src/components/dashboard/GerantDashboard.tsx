import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Wallet,
  Calendar,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";
import type { Database } from "@/types";
import { computeRevenue, computePayrollRatio, computeWasteTotal } from "@/lib/business";
import { detectAnomalies } from "@/lib/ai/anomaly-detector";
import { BigActionButton } from "@/components/ui/BigActionButton";
import { HelpTooltip } from "@/components/ui/HelpTooltip";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function lastSevenDays(db: Database) {
  const out: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const value = db.sales
      .filter((s) => s.date === key)
      .reduce((sum, s) => sum + s.revenue, 0);
    out.push({ label: DAY_LABELS[d.getDay()], value });
  }
  return out;
}

export function GerantDashboard({ db }: { db: Database }) {
  const alerts = db.notifications.filter((n) => !n.read && n.targetRoles.includes("gerant")).slice(0, 3);
  const aiAnomalies = detectAnomalies(db).slice(0, 2);
  const dayRevenue = computeRevenue(db, "day");
  const weekRevenue = computeRevenue(db, "week");
  const monthRevenue = computeRevenue(db, "month");
  const payrollRatio = computePayrollRatio(db);
  const waste = computeWasteTotal(db);
  const lowStockItems = db.stockItems.filter((s) => s.quantity <= s.minThreshold);
  const lowStock = lowStockItems.length;

  const avgDay = weekRevenue / 7;
  const revenueTrend = avgDay > 0 ? Math.round(((dayRevenue - avgDay) / avgDay) * 100) : 0;

  const series = lastSevenDays(db);
  const maxValue = Math.max(...series.map((s) => s.value), 1);

  const attentionItems = [
    ...alerts.map((a) => ({
      id: a.id,
      label: a.title,
      detail: a.message,
      href: null as string | null,
      urgent: a.severity === "critical",
    })),
    ...aiAnomalies.map((a) => ({
      id: a.id,
      label: a.title,
      detail: a.explanation,
      href: "/assistant-ia/anomalies",
      urgent: a.severity === "critical",
    })),
  ].slice(0, 4);

  const urgentCount = lowStock + attentionItems.filter((i) => i.urgent).length;

  return (
    <div data-onboarding="dashboard-welcome">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1A1D23]">
          {db.settings.restaurantName || "Mon restaurant"}
        </h1>
        <p className="page-subtitle mt-1 flex items-center gap-2">
          Vue d&apos;ensemble
          <HelpTooltip text="Les chiffres clés et alertes importantes sont affichés ici. Le détail de chaque module reste accessible via le menu." />
        </p>
      </div>

      {/* KPI — grille 2 colonnes */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card-surface p-4">
          <p className="kpi-label">Revenus du jour</p>
          <p className="kpi-value mt-2">{dayRevenue.toFixed(0)} €</p>
          <p
            className={`mt-1 inline-flex items-center gap-1 text-[12px] font-semibold ${
              revenueTrend >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {revenueTrend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {revenueTrend >= 0 ? "+" : ""}
            {revenueTrend}%
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-start justify-between">
            <p className="kpi-label">Articles critiques</p>
            {urgentCount > 0 && <AlertTriangle className="h-4 w-4 shrink-0 text-[#EF4444]" />}
          </div>
          <p className={`kpi-value mt-2 ${urgentCount > 0 ? "!text-[#EF4444]" : ""}`}>{urgentCount}</p>
          <p className="mt-1 text-[12px] text-[#6B7280]">Nécessitent une action</p>
        </div>

        <div className="card-surface p-4">
          <p className="kpi-label">Salaires / CA</p>
          <p className="kpi-value mt-2">{payrollRatio.toFixed(0)} %</p>
          <p className="mt-1 text-[12px] text-[#6B7280]">Sur 30 jours</p>
        </div>

        <div className="card-surface p-4">
          <p className="kpi-label">Gaspillage 30 j</p>
          <p className="kpi-value mt-2">{waste.value.toFixed(0)} €</p>
          <p className="mt-1 text-[12px] text-[#6B7280]">{waste.quantity.toFixed(0)} unités</p>
        </div>
      </div>

      {/* Graphique de ventes — fond sombre */}
      <div className="data-panel mt-3 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#9CA3AF]">
              Performance des ventes
            </p>
            <p className="mt-1 text-[22px] font-bold text-white">{weekRevenue.toFixed(0)} €</p>
            <p className="text-[12px] text-[#9CA3AF]">7 derniers jours</p>
          </div>
          <span className="rounded-[20px] bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white">
            Mois : {monthRevenue.toFixed(0)} €
          </span>
        </div>

        <div className="mt-5 flex h-32 items-end justify-between gap-2">
          {series.map((point, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="w-full max-w-[26px] rounded-t-md bg-[#1B3AE8]"
                  style={{ height: `${Math.max(4, (point.value / maxValue) * 100)}%` }}
                  title={`${point.value.toFixed(0)} €`}
                />
              </div>
              <span className="text-[10px] font-medium text-[#9CA3AF]">{point.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerte critique */}
      {urgentCount > 0 && (
        <div className="alert-block mt-3 flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#EF4444]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[#B91C1C]">Alerte rupture imminente</p>
            <p className="text-[12px] text-[#DC2626]">Plusieurs produits sont sous le seuil critique.</p>
          </div>
          <Link
            href="/stocks/commandes"
            className="shrink-0 rounded-lg bg-[#EF4444] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#DC2626]"
          >
            Gérer ({lowStock})
          </Link>
        </div>
      )}

      {/* Stocks critiques */}
      {lowStock > 0 && (
        <div className="card-surface mt-3 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[#1A1D23]">Stocks critiques</h3>
            <Link href="/stocks/inventaire" className="text-[12px] font-semibold text-[#1B3AE8] hover:underline">
              Voir tout
            </Link>
          </div>
          <ul className="divide-y divide-[#ECEEF3]">
            {lowStockItems.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[#1A1D23]">{item.name}</p>
                  <p className="text-[12px] text-[#6B7280]">
                    Seuil : {item.minThreshold} {item.unit}
                  </p>
                </div>
                <Badge variant={item.quantity <= 0 ? "danger" : item.quantity < item.minThreshold ? "danger" : "warning"}>
                  {item.quantity} {item.unit}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Attention */}
      <div className="mt-3" data-onboarding="gerant-attention">
        <Card
          title="Ce qui demande votre attention"
          help="Alertes et anomalies détectées automatiquement. Traitez l'essentiel sans parcourir tous les modules."
        >
          {attentionItems.length === 0 ? (
            <p className="text-[14px] text-[#10B981]">Tout va bien pour le moment.</p>
          ) : (
            <ul className="divide-y divide-[#ECEEF3]">
              {attentionItems.map((item) => {
                const content = (
                  <div className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1D23]">{item.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6B7280]">{item.detail}</p>
                    </div>
                    <Badge variant={item.urgent ? "danger" : "warning"}>
                      {item.urgent ? "Critique" : "À voir"}
                    </Badge>
                  </div>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className="block hover:opacity-80">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/assistant-ia/anomalies"
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#1B3AE8] hover:underline"
          >
            Voir toutes les anomalies <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>

      {/* Accès direct */}
      <div className="mt-3">
        <h2 className="section-label mb-3 flex items-center gap-2">
          Accès direct
          <HelpTooltip text="Raccourcis vers vos actions les plus courantes. Tous les modules restent disponibles dans le menu à gauche." />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-onboarding="gerant-ai">
          <BigActionButton href="/personnel/planning" label="Planning équipe" description="Organiser les horaires" icon={Calendar} variant="secondary" />
          <BigActionButton href="/stocks/courses" label="Liste de courses" description="Commander les produits" icon={ShoppingCart} variant="secondary" />
          <BigActionButton href="/assistant-ia/chat" label="Assistant intelligent" description="Poser une question" icon={Sparkles} variant="secondary" />
          <BigActionButton href="/finances/tresorerie" label="Trésorerie" description="Entrées et sorties d'argent" icon={Wallet} variant="secondary" />
          <BigActionButton href="/personnel/employes" label="Mon équipe" description="Fiches employés" icon={Users} variant="secondary" />
          <BigActionButton
            href="/stocks/inventaire"
            label="Inventaire"
            description={`${lowStock} produit${lowStock !== 1 ? "s" : ""} sous le seuil`}
            icon={Package}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
}
