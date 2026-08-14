import type { Database, Employee, StockItem, MenuItem } from "@/types";
import {
  computeFoodCost,
  computePayrollRatio,
  computeRevenue,
  computeWeeklyHours,
  computeWasteTotal,
} from "@/lib/business";
import { detectAnomalies } from "@/lib/ai/anomaly-detector";

const MONTHS: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, " ");
}

function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}

function weekStartIso(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

function parseTimeMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function computeActualHoursForWeek(db: Database, employeeId: string, weekStart: string): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  return db.timeEntries
    .filter(
      (t) =>
        t.employeeId === employeeId &&
        t.date >= weekStart &&
        t.date <= weekEndStr &&
        t.actualStart &&
        t.actualEnd
    )
    .reduce((total, t) => {
      const mins = parseTimeMinutes(t.actualEnd!) - parseTimeMinutes(t.actualStart!);
      return total + Math.max(mins, 0) / 60;
    }, 0);
}

function findEmployees(db: Database, text: string): Employee[] {
  const n = normalize(text);
  const tokens = n.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return [];

  return db.employees.filter((emp) => {
    const full = normalize(`${emp.firstName} ${emp.lastName}`);
    return tokens.some((t) => full.includes(t) || normalize(emp.firstName) === t || normalize(emp.lastName) === t);
  });
}

function findStockItems(db: Database, text: string): StockItem[] {
  const n = normalize(text);
  const matches = db.stockItems.filter((item) => normalize(item.name).includes(n) || n.includes(normalize(item.name)));
  if (matches.length > 0) return matches;

  const words = n.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    const found = db.stockItems.filter((item) => normalize(item.name).includes(word));
    if (found.length === 1) return found;
    if (found.length > 1) return found;
  }
  return [];
}

function extractAfterKeywords(text: string, keywords: string[]): string {
  const n = normalize(text);
  for (const kw of keywords) {
    const idx = n.indexOf(kw);
    if (idx >= 0) {
      return text.slice(idx + kw.length).trim().replace(/^(\s|de|d'|du|la|le|les|:|-)+/i, "").trim();
    }
  }
  return "";
}

function findMenuItems(db: Database, text: string): MenuItem[] {
  const n = normalize(text);
  return db.menuItems.filter(
    (m) => normalize(m.name).includes(n) || n.split(/\s+/).some((w) => w.length > 3 && normalize(m.name).includes(w))
  );
}

function salesInRange(db: Database, start: Date, end: Date) {
  return db.sales.filter((s) => {
    const d = new Date(s.date);
    return d >= start && d <= end;
  });
}

function monthBounds(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

function parseMonthFromText(text: string): { year: number; month: number } | null {
  const n = normalize(text);
  const now = new Date();
  for (const [name, month] of Object.entries(MONTHS)) {
    if (n.includes(name)) {
      const yearMatch = n.match(/\b(20\d{2})\b/);
      const year = yearMatch ? Number(yearMatch[1]) : now.getFullYear();
      return { year, month };
    }
  }
  return null;
}

function periodLabel(period: "day" | "week" | "month"): string {
  if (period === "day") return "aujourd'hui";
  if (period === "week") return "sur les 7 derniers jours";
  return "sur les 30 derniers jours";
}

function detectPeriod(text: string): "day" | "week" | "month" {
  const n = normalize(text);
  if (/\baujourd|ce jour|today\b/.test(n)) return "day";
  if (/\bsemaine|7 jour|cette semaine\b/.test(n)) return "week";
  return "month";
}

function answerStock(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(stock|stocks|quantite|inventaire|reste|restent|farine|beurre|huile|viande|legume|rupture)/.test(n)) {
    return null;
  }

  const query =
    extractAfterKeywords(question, ["stock de", "stock du", "stock d'", "stock ", "quantite de", "quantite du"]) ||
    question;

  const items = findStockItems(db, query);
  if (items.length === 0) {
    if (db.stockItems.length === 0) {
      return "Aucun article n'est enregistré dans les stocks de l'application.";
    }
    const low = db.stockItems.filter((i) => i.quantity <= i.minThreshold);
    if (/(critique|alerte|sous seuil|rupture)/.test(n) && low.length > 0) {
      return `Stocks sous le seuil (${low.length} article(s)) :\n${low
        .slice(0, 8)
        .map((i) => `• ${i.name} : ${i.quantity} ${i.unit} (seuil min. ${i.minThreshold})`)
        .join("\n")}`;
    }
    return "Je n'ai pas identifié l'article demandé. Précisez le nom (ex. « stock de farine »). Articles en base : " +
      db.stockItems.slice(0, 10).map((i) => i.name).join(", ") +
      (db.stockItems.length > 10 ? "…" : "");
  }

  if (items.length > 1) {
    return `Plusieurs articles correspondent :\n${items.map((i) => `• ${i.name} : ${i.quantity} ${i.unit}`).join("\n")}`;
  }

  const item = items[0];
  const status = item.quantity <= item.minThreshold ? " (sous le seuil minimum)" : "";
  return `${item.name} : ${item.quantity} ${item.unit} en stock${status}. Seuil minimum : ${item.minThreshold} ${item.unit}. Valeur unitaire : ${formatEuro(item.unitPrice)}/${item.unit}.`;
}

function answerEmployeeHours(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(heure|heures|travaille|travaille|planning|pointage|effectif)/.test(n)) return null;

  const employees = findEmployees(db, question);
  if (employees.length === 0) {
    if (db.employees.length === 0) return "Aucun employé n'est enregistré dans l'application.";
    return "Je n'ai pas reconnu le nom de l'employé. Employés en base : " +
      db.employees.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
  }
  if (employees.length > 1) {
    return `Plusieurs employés correspondent : ${employees.map((e) => `${e.firstName} ${e.lastName}`).join(", ")}. Reformulez avec le nom complet.`;
  }

  const emp = employees[0];
  const ws = weekStartIso();
  const planned = computeWeeklyHours(db, emp.id, ws);
  const actual = computeActualHoursForWeek(db, emp.id, ws);
  const useActual = /effectif|pointe|pointage|reel/.test(n);

  if (useActual) {
    if (actual === 0 && db.timeEntries.filter((t) => t.employeeId === emp.id).length === 0) {
      return `${emp.firstName} ${emp.lastName} : aucun pointage enregistré cette semaine (semaine du ${ws}). Heures planifiées : ${planned.toFixed(1)} h.`;
    }
    return `${emp.firstName} ${emp.lastName} a ${actual.toFixed(1)} h effectives cette semaine (semaine du ${ws}, d'après les pointages). Heures planifiées : ${planned.toFixed(1)} h (max ${emp.weeklyMaxHours} h).`;
  }

  return `${emp.firstName} ${emp.lastName} : ${planned.toFixed(1)} h planifiées cette semaine (semaine du ${ws}). Limite contractuelle : ${emp.weeklyMaxHours} h/semaine.${
    actual > 0 ? ` Pointages enregistrés : ${actual.toFixed(1)} h effectives.` : ""
  }`;
}

function answerMenuProfitability(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(rentabl|marge|plat|menu|chiffre.*plat|plus rentable|meilleur plat|benefice)/.test(n)) return null;

  const period = detectPeriod(question);
  const now = new Date();
  let start: Date;
  let end = now;
  if (period === "day") {
    start = new Date(now.toISOString().split("T")[0]);
  } else if (period === "week") {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else {
    start = new Date(now);
    start.setMonth(start.getMonth() - 1);
  }

  const sales = salesInRange(db, start, end);
  if (sales.length === 0) {
    return `Aucune vente enregistrée ${periodLabel(period)} dans l'application — impossible de calculer la rentabilité par plat.`;
  }

  const byMenu = new Map<string, { qty: number; revenue: number }>();
  for (const s of sales) {
    const cur = byMenu.get(s.menuItemId) ?? { qty: 0, revenue: 0 };
    cur.qty += s.quantity;
    cur.revenue += s.revenue;
    byMenu.set(s.menuItemId, cur);
  }

  const ranked = [...byMenu.entries()]
    .map(([menuItemId, data]) => {
      const menu = db.menuItems.find((m) => m.id === menuItemId);
      const unitCost = computeFoodCost(db, menuItemId);
      const margin = data.revenue - unitCost * data.qty;
      const name = menu?.name ?? menuItemId;
      return { name, margin, revenue: data.revenue, qty: data.qty, unitCost };
    })
    .sort((a, b) => b.margin - a.margin);

  if (ranked.length === 0) return "Données de ventes présentes mais aucun plat identifié.";

  const best = ranked[0];
  const lines = ranked.slice(0, 5).map(
    (r, i) =>
      `${i + 1}. ${r.name} — marge ${formatEuro(r.margin)} (${r.qty} vendus, CA ${formatEuro(r.revenue)}, coût matière ~${formatEuro(r.unitCost)}/unité)`
  );

  return `Plat le plus rentable ${periodLabel(period)} : **${best.name}** avec une marge estimée de ${formatEuro(best.margin)} (${best.qty} ventes, CA ${formatEuro(best.revenue)}).\n\nTop 5 par marge :\n${lines.join("\n")}\n\n(Calcul : CA ventes − coût matière recette × quantités vendues.)`;
}

function answerRevenue(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(ca\b|chiffre.*affaire|revenu|recette|vente)/.test(n)) return null;

  const period = detectPeriod(question);
  const amount = computeRevenue(db, period);
  if (amount === 0 && db.sales.length === 0) {
    return "Aucune vente n'est enregistrée dans l'application.";
  }
  if (amount === 0) {
    return `CA ${periodLabel(period)} : ${formatEuro(0)} (aucune vente sur cette période).`;
  }
  return `Chiffre d'affaires ${periodLabel(period)} : ${formatEuro(amount)} (source : ${db.sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "day") return s.date === new Date().toISOString().split("T")[0];
    if (period === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 7);
      return d >= w;
    }
    const m = new Date();
    m.setMonth(m.getMonth() - 1);
    return d >= m;
  }).length} ligne(s) de ventes).`;
}

function answerPayroll(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(masse salariale|payroll|salaire|salaires|ratio.*salar)/.test(n)) return null;

  const ratio = computePayrollRatio(db);
  const monthRevenue = computeRevenue(db, "month");
  const payroll = db.cashFlow
    .filter((c) => c.category === "Masse salariale" && c.type === "expense")
    .reduce((s, c) => s + c.amount, 0);

  if (payroll === 0 && db.cashFlow.length === 0) {
    return "Aucune écriture de trésorerie « Masse salariale » enregistrée — ratio indisponible.";
  }

  return `Masse salariale (30 derniers jours, trésorerie) : ${formatEuro(payroll)}. CA sur la même période : ${formatEuro(monthRevenue)}. Ratio masse salariale / CA : ${ratio.toFixed(1)} %.`;
}

function answerMarginTrend(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(marge|benefice|baiss|augment|evolution|evolue)/.test(n)) return null;

  const parsed = parseMonthFromText(question);
  const now = new Date();

  function netForMonth(year: number, month: number) {
    const { start, end } = monthBounds(year, month);
    const entries = db.cashFlow.filter((c) => {
      const d = new Date(c.date);
      return d >= start && d <= end;
    });
    const income = entries.filter((c) => c.type === "income").reduce((s, c) => s + c.amount, 0);
    const expense = entries.filter((c) => c.type === "expense").reduce((s, c) => s + c.amount, 0);
    return { income, expense, net: income - expense, count: entries.length };
  }

  if (parsed) {
    const cur = netForMonth(parsed.year, parsed.month);
    const prevMonth = parsed.month === 0 ? 11 : parsed.month - 1;
    const prevYear = parsed.month === 0 ? parsed.year - 1 : parsed.year;
    const prev = netForMonth(prevYear, prevMonth);

    if (cur.count === 0) {
      return `Aucune écriture de trésorerie enregistrée pour ${Object.keys(MONTHS).find((k) => MONTHS[k] === parsed.month) ?? "ce mois"} ${parsed.year}.`;
    }

    const monthName = Object.entries(MONTHS).find(([, m]) => m === parsed.month)?.[0] ?? "le mois";
    const diff = cur.net - prev.net;
    const trend = diff > 0 ? "augmentation" : diff < 0 ? "baisse" : "stabilité";

    return `Trésorerie nette en ${monthName} ${parsed.year} : ${formatEuro(cur.net)} (recettes ${formatEuro(cur.income)}, dépenses ${formatEuro(cur.expense)}). Par rapport au mois précédent : ${trend} de ${formatEuro(Math.abs(diff))}.\n\n${
      diff < 0
        ? "Analyse possible : vérifiez les postes de dépenses en hausse dans Finances → Trésorerie."
        : "Consultez Finances → Trésorerie pour le détail par catégorie."
    }`;
  }

  const thisMonth = netForMonth(now.getFullYear(), now.getMonth());
  const lastMonth = netForMonth(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );

  if (thisMonth.count === 0 && lastMonth.count === 0) {
    return "Pas assez de données de trésorerie pour analyser l'évolution de marge.";
  }

  return `Marge nette (trésorerie) ce mois-ci : ${formatEuro(thisMonth.net)}. Mois dernier : ${formatEuro(lastMonth.net)}. Écart : ${formatEuro(thisMonth.net - lastMonth.net)}.`;
}

function answerReservations(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(reservation|réservation|couverts|bookings)/.test(n)) return null;

  const today = new Date().toISOString().split("T")[0];
  const upcoming = db.reservations.filter(
    (r) => r.status === "confirmed" && r.date >= today
  );

  if (upcoming.length === 0) {
    return db.reservations.length === 0
      ? "Aucune réservation enregistrée dans l'application."
      : "Aucune réservation confirmée à venir.";
  }

  const todayRes = upcoming.filter((r) => r.date === today);
  const totalCovers = upcoming.reduce((s, r) => s + r.covers, 0);

  return `${upcoming.length} réservation(s) confirmée(s) à venir (${totalCovers} couverts au total).${
    todayRes.length > 0
      ? `\nAujourd'hui : ${todayRes.length} réservation(s), ${todayRes.reduce((s, r) => s + r.covers, 0)} couverts.`
      : ""
  }`;
}

function answerWaste(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(gaspillage|perte|waste|gach)/.test(n)) return null;

  const w = computeWasteTotal(db, 30);
  if (w.value === 0 && db.wasteEntries.length === 0) {
    return "Aucun gaspillage enregistré sur les 30 derniers jours.";
  }
  return `Gaspillage sur 30 jours : ${w.quantity.toFixed(1)} unités, valeur ${formatEuro(w.value)} (${db.wasteEntries.filter((e) => new Date(e.date) >= new Date(Date.now() - 30 * 86400000)).length} entrée(s)).`;
}

function answerEmployees(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(employe|employes|equipe|personnel|combien.*travaille)/.test(n)) return null;
  if (/(heure|planning|stock|plat|ca\b)/.test(n) && !/(qui travaille|equipe)/.test(n)) return null;

  const active = db.employees.filter((e) => e.active);
  if (active.length === 0) return "Aucun employé actif enregistré.";

  return `${active.length} employé(s) actif(s) : ${active.map((e) => `${e.firstName} ${e.lastName} (${e.role})`).join(", ")}.`;
}

function answerWeekendStaff(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(week-end|weekend|samedi|dimanche|qui travaille)/.test(n)) return null;

  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const ws = monday.toISOString().split("T")[0];

  const weekendDays = [6, 7];
  const slots = db.shiftSlots.filter((s) => s.weekStart === ws && weekendDays.includes(s.dayOfWeek));

  if (slots.length === 0) {
    return `Aucun shift planifié ce week-end (semaine du ${ws}) dans le planning.`;
  }

  const byDay: Record<number, string[]> = { 6: [], 7: [] };
  for (const slot of slots) {
    const emp = db.employees.find((e) => e.id === slot.employeeId);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : "Employé inconnu";
    const line = `${name} (${slot.startTime}–${slot.endTime})`;
    if (!byDay[slot.dayOfWeek].includes(line)) byDay[slot.dayOfWeek].push(line);
  }

  const sat = byDay[6].length ? byDay[6].join(", ") : "Personne";
  const sun = byDay[7].length ? byDay[7].join(", ") : "Personne";

  return `Planning du week-end (semaine du ${ws}) :\n• Samedi : ${sat}\n• Dimanche : ${sun}`;
}

function answerAnomalies(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(anomal|alerte|probleme|problème|attention|risque)/.test(n)) return null;

  const anomalies = detectAnomalies(db);
  if (anomalies.length === 0) return "Aucune anomalie significative détectée dans les données actuelles.";

  return `Anomalies détectées (${anomalies.length}) :\n${anomalies
    .slice(0, 6)
    .map((a) => `• [${a.severity}] ${a.title} — ${a.calculation}`)
    .join("\n")}`;
}

function answerFoodCost(db: Database, question: string): string | null {
  const n = normalize(question);
  if (!/(food cost|cout matiere|coût matière|cout de revient)/.test(n)) return null;

  const items = findMenuItems(db, question);
  if (items.length === 1) {
    const m = items[0];
    const cost = computeFoodCost(db, m.id);
    const pct = m.price > 0 ? (cost / m.price) * 100 : 0;
    return `${m.name} : prix ${formatEuro(m.price)}, coût matière ${formatEuro(cost)} (${pct.toFixed(1)} % du prix).`;
  }

  const ranked = db.menuItems
    .map((m) => ({
      name: m.name,
      cost: computeFoodCost(db, m.id),
      price: m.price,
      pct: m.price > 0 ? (computeFoodCost(db, m.id) / m.price) * 100 : 0,
    }))
    .filter((m) => m.price > 0)
    .sort((a, b) => b.pct - a.pct);

  if (ranked.length === 0) return "Aucun plat en carte avec recette enregistrée.";

  return `Food cost par plat (top 5) :\n${ranked
    .slice(0, 5)
    .map((m) => `• ${m.name} : ${m.pct.toFixed(1)} % (${formatEuro(m.cost)} / ${formatEuro(m.price)})`)
    .join("\n")}`;
}

function answerHelp(): string {
  return `Je réponds à partir des données enregistrées dans votre application. Exemples :
• « Quel est mon plat le plus rentable ce mois-ci ? »
• « Combien d'heures Marc a-t-il travaillé cette semaine ? »
• « Quel est mon stock de farine ? »
• « Quel est mon CA cette semaine ? »
• « Pourquoi ma marge a baissé en juin ? »
• « Quelles anomalies sont détectées ? »

Je ne modifie jamais vos données automatiquement. Pour une action (planning, commande, prix…), utilisez le module concerné.`;
}

const HANDLERS: ((db: Database, q: string) => string | null)[] = [
  answerWeekendStaff,
  answerEmployeeHours,
  answerStock,
  answerMenuProfitability,
  answerMarginTrend,
  answerRevenue,
  answerPayroll,
  answerFoodCost,
  answerReservations,
  answerWaste,
  answerAnomalies,
  answerEmployees,
];

export function answerGerantQuestion(db: Database, question: string): string {
  const trimmed = question.trim();
  if (!trimmed) {
    return "Posez une question sur votre établissement (personnel, stocks, finances, clientèle…).";
  }

  const n = normalize(trimmed);
  if (/^(aide|help|\?|bonjour|salut)/.test(n) && n.length < 20) {
    return answerHelp();
  }

  for (const handler of HANDLERS) {
    const answer = handler(db, trimmed);
    if (answer) {
      return `${answer}\n\n— Réponse calculée depuis vos données enregistrées. Aucune action n'a été exécutée.`;
    }
  }

  if (db.settings.restaurantName) {
    return `Je n'ai pas trouvé de données correspondant précisément à « ${trimmed} ».\n\n${answerHelp()}`;
  }

  return `Je n'ai pas trouvé de réponse dans les données disponibles.\n\n${answerHelp()}`;
}
