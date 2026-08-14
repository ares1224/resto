import type { Database } from "@/types";
import type { AnomalyAlert } from "@/types/ai";
import { computeFoodCost } from "@/lib/business";

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmtQty(value: number, unit: string): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`;
}

function fmtEuro(value: number): string {
  return `${value.toFixed(0)} €`;
}

function stockUsageFromSales(db: Database, stockItemId: string, since: string): number {
  let total = 0;
  const ingredientIds = db.ingredients.filter((i) => i.stockItemId === stockItemId).map((i) => i.id);
  if (ingredientIds.length === 0) return 0;

  for (const sale of db.sales.filter((s) => s.date >= since)) {
    const recipe = db.recipes.find((r) => r.menuItemId === sale.menuItemId);
    if (!recipe) continue;
    for (const ri of recipe.ingredients) {
      if (ingredientIds.includes(ri.ingredientId)) {
        total += ri.quantity * sale.quantity;
      }
    }
  }
  return total;
}

export function detectAnomalies(db: Database): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const today = new Date().toISOString().split("T")[0];
  const since14 = addDays(today, -14);
  const since30 = addDays(today, -30);
  const since90 = addDays(today, -90);

  for (const item of db.stockItems) {
    const theoretical = stockUsageFromSales(db, item.id, since14);
    const wasteQty = db.wasteEntries
      .filter((w) => w.stockItemId === item.id && w.date >= since14)
      .reduce((s, w) => s + w.quantity, 0);
    const wasteValue = db.wasteEntries
      .filter((w) => w.stockItemId === item.id && w.date >= since14)
      .reduce((s, w) => s + w.value, 0);

    if (theoretical > 0 && wasteQty > theoretical * 0.2) {
      const ratio = (wasteQty / theoretical) * 100;
      const thresholdPct = 20;
      alerts.push({
        id: `stock-waste-${item.id}`,
        category: "stock",
        severity: wasteQty > theoretical * 0.35 ? "critical" : "warning",
        title: `Gaspillage anormal — ${item.name}`,
        explanation: `Le gaspillage enregistré sur 14 jours dépasse le seuil de ${thresholdPct} % de la consommation calculée à partir des ventes. Vérifiez les portions, la conservation ou les saisies en registre.`,
        calculation: `Consommation théorique (ventes × recettes, 14 j) : ${fmtQty(theoretical, item.unit)} · Gaspillage déclaré : ${fmtQty(wasteQty, item.unit)} (${ratio.toFixed(0)} %) · Valeur perdue : ${fmtEuro(wasteValue)}`,
        details: [
          { label: "Période analysée", value: "14 derniers jours" },
          { label: "Consommation théorique (ventes)", value: fmtQty(theoretical, item.unit) },
          { label: "Gaspillage enregistré", value: fmtQty(wasteQty, item.unit) },
          { label: "Ratio gaspillage / consommation", value: `${ratio.toFixed(0)} %`, highlight: true },
          { label: "Seuil d'alerte", value: `${thresholdPct} %` },
          { label: "Valeur gaspillée", value: fmtEuro(wasteValue) },
        ],
        actionHref: "/stocks/commandes",
      });
    }

    if (theoretical > 0 && item.quantity < theoretical * 0.3) {
      const unexplainedGap = Math.max(0, theoretical - item.quantity - wasteQty);
      const coveragePct = (item.quantity / theoretical) * 100;
      alerts.push({
        id: `stock-gap-${item.id}`,
        category: "stock",
        severity: item.quantity <= item.minThreshold ? "critical" : "warning",
        title: `Écart d'inventaire — ${item.name}`,
        explanation:
          unexplainedGap > 0
            ? `Stock théorique de ${item.name.toLowerCase()} (consommation 14 j) : ${fmtQty(theoretical, item.unit)}, stock réel constaté : ${fmtQty(item.quantity, item.unit)}, écart de ${fmtQty(unexplainedGap, item.unit)} non expliqué par les ventes et le gaspillage enregistré.`
            : `Le stock restant (${fmtQty(item.quantity, item.unit)}) est très inférieur à la consommation récente (${fmtQty(theoretical, item.unit)} sur 14 j) — risque de rupture ou inventaire à vérifier.`,
        calculation: `Stock réel : ${fmtQty(item.quantity, item.unit)} · Consommation théorique 14 j : ${fmtQty(theoretical, item.unit)} · Gaspillage 14 j : ${fmtQty(wasteQty, item.unit)} · Seuil minimum : ${fmtQty(item.minThreshold, item.unit)}`,
        details: [
          { label: "Stock réel constaté", value: fmtQty(item.quantity, item.unit), highlight: true },
          { label: "Consommation théorique (14 j)", value: fmtQty(theoretical, item.unit) },
          { label: "Gaspillage enregistré (14 j)", value: fmtQty(wasteQty, item.unit) },
          ...(unexplainedGap > 0
            ? [{ label: "Écart non expliqué", value: fmtQty(unexplainedGap, item.unit), highlight: true }]
            : []),
          { label: "Couverture vs consommation", value: `${coveragePct.toFixed(0)} %` },
          { label: "Seuil minimum", value: fmtQty(item.minThreshold, item.unit) },
        ],
        actionHref: "/stocks/commandes",
      });
    }
  }

  const menuIds = [...new Set(db.sales.filter((s) => s.date >= since30).map((s) => s.menuItemId))];
  for (const menuItemId of menuIds) {
    const menuItem = db.menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) continue;
    const foodCost = computeFoodCost(db, menuItemId);
    const price = menuItem.price;

    const recentSales = db.sales.filter((s) => s.menuItemId === menuItemId && s.date >= since30);
    const olderSales = db.sales.filter(
      (s) => s.menuItemId === menuItemId && s.date >= since90 && s.date < since30
    );
    if (recentSales.length < 3 || olderSales.length < 3) continue;

    const recentAvgPrice =
      recentSales.reduce((s, sale) => s + sale.revenue / sale.quantity, 0) / recentSales.length;
    const olderAvgPrice =
      olderSales.reduce((s, sale) => s + sale.revenue / sale.quantity, 0) / olderSales.length;
    const recentMargin = recentAvgPrice - foodCost;
    const olderMargin = olderAvgPrice - foodCost;
    const recentFoodCostPct = price > 0 ? (foodCost / price) * 100 : 0;
    const drop = olderMargin > 0 ? ((olderMargin - recentMargin) / olderMargin) * 100 : 0;

    if (drop > 15 || recentFoodCostPct > 40) {
      const recentMarginPct = recentAvgPrice > 0 ? (recentMargin / recentAvgPrice) * 100 : 0;
      const olderMarginPct = olderAvgPrice > 0 ? (olderMargin / olderAvgPrice) * 100 : 0;
      alerts.push({
        id: `margin-${menuItemId}`,
        category: "margin",
        severity: drop > 25 || recentFoodCostPct > 45 ? "critical" : "warning",
        title: `Marge anormale — ${menuItem.name}`,
        explanation:
          drop > 15
            ? `La marge sur « ${menuItem.name} » a baissé de ${drop.toFixed(0)} % par rapport à la période précédente (60–90 j vs 30 j récents). Causes possibles : hausse des prix d'achat, baisse du prix de vente effectif ou recette modifiée.`
            : `Le food cost de « ${menuItem.name} » atteint ${recentFoodCostPct.toFixed(0)} % du prix carte (seuil d'alerte : 40 %). La marge brute est insuffisante.`,
        calculation: `Coût matière : ${foodCost.toFixed(2)} € · Prix carte : ${price.toFixed(2)} € · Marge récente : ${recentMargin.toFixed(2)} € (${recentMarginPct.toFixed(0)} %) · Marge historique : ${olderMargin.toFixed(2)} € (${olderMarginPct.toFixed(0)} %)`,
        details: [
          { label: "Coût matière (recette)", value: `${foodCost.toFixed(2)} €` },
          { label: "Prix carte", value: `${price.toFixed(2)} €` },
          { label: "Food cost %", value: `${recentFoodCostPct.toFixed(1)} %`, highlight: recentFoodCostPct > 40 },
          { label: "Marge moyenne (30 j)", value: `${recentMargin.toFixed(2)} € (${recentMarginPct.toFixed(0)} %)`, highlight: true },
          { label: "Marge moyenne (60–90 j)", value: `${olderMargin.toFixed(2)} € (${olderMarginPct.toFixed(0)} %)` },
          ...(drop > 15 ? [{ label: "Baisse de marge", value: `−${drop.toFixed(0)} %`, highlight: true }] : []),
        ],
        actionHref: "/assistant-ia/anomalies",
      });
    }
  }

  const monthStart = today.slice(0, 7) + "-01";
  const expenses = db.cashFlow.filter((c) => c.type === "expense");
  const categories = [...new Set(expenses.map((e) => e.category))];

  for (const category of categories) {
    const currentMonth = expenses
      .filter((e) => e.category === category && e.date >= monthStart)
      .reduce((s, e) => s + e.amount, 0);

    const prevMonths: number[] = [];
    for (let m = 1; m <= 3; m++) {
      const d = new Date(monthStart);
      d.setMonth(d.getMonth() - m);
      const start = d.toISOString().split("T")[0].slice(0, 7) + "-01";
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const total = expenses
        .filter((e) => e.category === category && e.date >= start && e.date <= end)
        .reduce((s, e) => s + e.amount, 0);
      if (total > 0) prevMonths.push(total);
    }

    if (prevMonths.length === 0 || currentMonth === 0) continue;
    const avgPrev = prevMonths.reduce((s, v) => s + v, 0) / prevMonths.length;
    const variation = ((currentMonth - avgPrev) / avgPrev) * 100;

    if (Math.abs(variation) > 25) {
      const diff = currentMonth - avgPrev;
      alerts.push({
        id: `expense-${category}`,
        category: "expense",
        severity: Math.abs(variation) > 40 ? "critical" : "warning",
        title: `Charge ${variation > 0 ? "en hausse" : "en baisse"} — ${category}`,
        explanation: `Les dépenses « ${category} » ce mois (${fmtEuro(currentMonth)}) s'écartent de ${Math.abs(variation).toFixed(0)} % par rapport à la moyenne des 3 mois précédents (${fmtEuro(avgPrev)}). Écart absolu : ${variation > 0 ? "+" : ""}${fmtEuro(diff)}.`,
        calculation: `Mois en cours : ${fmtEuro(currentMonth)} · Moyenne 3 mois : ${fmtEuro(avgPrev)} · Variation : ${variation > 0 ? "+" : ""}${variation.toFixed(0)} %`,
        details: [
          { label: "Mois en cours", value: fmtEuro(currentMonth), highlight: true },
          { label: "Moyenne 3 mois précédents", value: fmtEuro(avgPrev) },
          { label: "Écart en euros", value: `${variation > 0 ? "+" : ""}${fmtEuro(diff)}`, highlight: true },
          { label: "Variation en %", value: `${variation > 0 ? "+" : ""}${variation.toFixed(0)} %`, highlight: true },
        ],
        actionHref: "/assistant-ia/anomalies",
      });
    }
  }

  return alerts.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (b.severity === "critical" && a.severity !== "critical") return 1;
    return 0;
  });
}

export function filterAnomalies(
  alerts: AnomalyAlert[],
  categories?: AnomalyAlert["category"][]
): AnomalyAlert[] {
  if (!categories || categories.length === 0) return alerts;
  return alerts.filter((a) => categories.includes(a.category));
}
