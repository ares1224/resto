import type { Database, Notification } from "@/types";
import { generateSupplierOrderDrafts } from "@/lib/ai/restock-alerts";

function newId(): string {
  return crypto.randomUUID();
}

function addNotification(
  db: Database,
  notification: Omit<Notification, "id" | "createdAt" | "read">
): void {
  const exists = db.notifications.some(
    (n) => n.title === notification.title && !n.read && n.type === notification.type
  );
  if (exists) return;
  db.notifications.unshift({
    ...notification,
    id: newId(),
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export function runAlertEngine(db: Database): void {
  for (const item of db.stockItems) {
    if (item.quantity <= item.minThreshold) {
      addNotification(db, {
        type: "stock",
        title: "Rupture imminente",
        message: `${item.name} sous le seuil (${item.quantity} ${item.unit} / min ${item.minThreshold})`,
        severity: item.quantity <= item.minThreshold * 0.5 ? "critical" : "warning",
        targetRoles: ["gerant", "manager"],
      });
    }
    if (item.expiryDate) {
      const daysLeft = Math.ceil(
        (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 2 && daysLeft >= 0) {
        addNotification(db, {
          type: "expiry",
          title: "Péremption proche",
          message: `${item.name} expire ${daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft} jour(s)`}`,
          severity: daysLeft === 0 ? "critical" : "warning",
          targetRoles: ["gerant", "manager"],
        });
      }
    }
  }

  for (const peak of db.settings.peakSlots) {
    const staffCount = db.shiftSlots.filter(
      (s) => s.dayOfWeek === peak.dayOfWeek && s.isPeak && overlaps(s.startTime, s.endTime, peak.start, peak.end)
    ).length;
    if (staffCount < peak.minStaff) {
      addNotification(db, {
        type: "staffing",
        title: "Sous-effectif détecté",
        message: `Jour ${peak.dayOfWeek}: ${staffCount} staff, minimum ${peak.minStaff}`,
        severity: "warning",
        targetRoles: ["gerant", "manager"],
      });
    }
  }

  for (const absence of db.absences.filter((a) => a.replacementRequested)) {
    addNotification(db, {
      type: "replacement",
      title: "Remplacement requis",
      message: `Absence le ${absence.date} — offres envoyées aux disponibles`,
      severity: "info",
      targetRoles: ["gerant", "manager", "employe"],
    });
  }

  for (const reminder of db.complianceReminders.filter((r) => !r.completed)) {
    const daysLeft = Math.ceil(
      (new Date(reminder.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7) {
      addNotification(db, {
        type: "compliance",
        title: "Contrôle obligatoire",
        message: `${reminder.title} — échéance ${reminder.dueDate}`,
        severity: daysLeft < 0 ? "critical" : "warning",
        targetRoles: ["gerant", "manager"],
      });
    }
  }

  for (const res of db.reservations.filter((r) => r.status === "confirmed" && !r.reminderSent)) {
    const resDate = new Date(`${res.date}T${res.time}`);
    const hoursUntil = (resDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 24) {
      addNotification(db, {
        type: "reservation",
        title: "Rappel réservation à envoyer",
        message: `${res.guestName} — ${res.covers} couverts le ${res.date} à ${res.time}`,
        severity: "info",
        targetRoles: ["gerant", "manager"],
      });
    }
  }

  regenerateShoppingList(db);
  generateSupplierOrderDrafts(db);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function regenerateShoppingList(db: Database): void {
  const previous = db.shoppingList ?? [];
  const manualItems = previous.filter((s) => s.manual);
  const manualStockIds = new Set(
    manualItems.map((m) => m.stockItemId).filter((id): id is string => Boolean(id))
  );

  const autoItems: typeof db.shoppingList = db.stockItems
    .filter((item) => item.quantity <= item.minThreshold && !manualStockIds.has(item.id))
    .map((item) => {
      const existing = previous.find((s) => s.id === `shop-${item.id}` || s.stockItemId === item.id);
      return {
        id: existing?.id ?? `shop-${item.id}`,
        stockItemId: item.id,
        supplierId: existing?.supplierId ?? item.supplierId,
        suggestedQty: existing?.manual
          ? existing.suggestedQty
          : Math.max(item.minThreshold * 2 - item.quantity, 1),
        reason:
          existing?.manual && existing.reason
            ? existing.reason
            : item.expiryDate && new Date(item.expiryDate).getTime() - Date.now() < 2 * 86400000
              ? "Sous seuil + péremption proche"
              : "Sous seuil minimum",
        ordered: existing?.ordered ?? false,
        manual: existing?.manual ?? false,
      };
    });

  db.shoppingList = [...manualItems, ...autoItems];
}

export function computeFoodCost(db: Database, menuItemId: string): number {
  const recipe = db.recipes.find((r) => r.menuItemId === menuItemId);
  if (!recipe) return 0;
  return recipe.ingredients.reduce((total, ri) => {
    const ing = db.ingredients.find((i) => i.id === ri.ingredientId);
    if (!ing) return total;
    const stock = db.stockItems.find((s) => s.id === ing.stockItemId);
    if (!stock) return total;
    return total + stock.unitPrice * ri.quantity;
  }, 0);
}

export function computeWeeklyHours(db: Database, employeeId: string, weekStart: string): number {
  const slots = db.shiftSlots.filter((s) => s.employeeId === employeeId && s.weekStart === weekStart);
  return slots.reduce((total, slot) => {
    const start = parseTime(slot.startTime);
    const end = parseTime(slot.endTime);
    return total + (end - start) / 60 - slot.breakMinutes / 60;
  }, 0);
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function validateShiftLegal(db: Database, employeeId: string, weekStart: string): string[] {
  const errors: string[] = [];
  const hours = computeWeeklyHours(db, employeeId, weekStart);
  const employee = db.employees.find((e) => e.id === employeeId);
  const maxHours = employee?.weeklyMaxHours ?? db.settings.maxWeeklyHours;
  if (hours > maxHours) {
    errors.push(`Dépassement heures max (${hours.toFixed(1)}h / ${maxHours}h)`);
  }
  if (hours > db.settings.maxWeeklyHours) {
    errors.push(`Limite légale ${db.settings.maxWeeklyHours}h/semaine dépassée`);
  }
  return errors;
}

export function computeWasteTotal(db: Database, days = 30): { quantity: number; value: number } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const entries = db.wasteEntries.filter((w) => new Date(w.date) >= cutoff);
  return {
    quantity: entries.reduce((s, e) => s + e.quantity, 0),
    value: entries.reduce((s, e) => s + e.value, 0),
  };
}

export function computeRevenue(db: Database, period: "day" | "week" | "month"): number {
  const now = new Date();
  const sales = db.sales.filter((s) => {
    const d = new Date(s.date);
    if (period === "day") return s.date === now.toISOString().split("T")[0];
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return d >= monthAgo;
  });
  return sales.reduce((s, sale) => s + sale.revenue, 0);
}

export function computePayrollRatio(db: Database): number {
  const monthRevenue = computeRevenue(db, "month");
  const payroll = db.cashFlow
    .filter((c) => c.category === "Masse salariale" && c.type === "expense")
    .reduce((s, c) => s + c.amount, 0);
  return monthRevenue > 0 ? (payroll / monthRevenue) * 100 : 0;
}

export function getMenuAllergens(db: Database, menuItemId: string): string[] {
  const item = db.menuItems.find((m) => m.id === menuItemId);
  if (item?.allergens.length) return item.allergens;
  const recipe = db.recipes.find((r) => r.menuItemId === menuItemId);
  if (!recipe) return [];
  const allergens = new Set<string>();
  for (const ri of recipe.ingredients) {
    const ing = db.ingredients.find((i) => i.id === ri.ingredientId);
    ing?.allergens.forEach((a) => allergens.add(a));
  }
  return [...allergens];
}

export function autoHideMenuFromStock(db: Database): void {
  for (const item of db.menuItems) {
    const recipe = db.recipes.find((r) => r.menuItemId === item.id);
    if (!recipe) continue;
    const unavailable = recipe.ingredients.some((ri) => {
      const ing = db.ingredients.find((i) => i.id === ri.ingredientId);
      const stock = ing ? db.stockItems.find((s) => s.id === ing.stockItemId) : null;
      return stock && stock.quantity < ri.quantity;
    });
    if (unavailable && item.available) {
      item.available = false;
    }
  }
}
