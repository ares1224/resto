import type { Session } from "@/lib/auth";
import type {
  Database,
  Employee,
  ShiftSlot,
  PlanningPublication,
  TimeEntry,
  Absence,
  ReplacementOffer,
  Availability,
  Notification,
  StockItem,
  Supplier,
  PriceHistory,
  Sale,
  CashFlowEntry,
} from "@/types";

/** Fiche RH complète */
export function getEmployeesForSession(db: Database, session: Session): Employee[] {
  if (session.role === "gerant") return db.employees;
  if (session.role === "employe" && session.employeeId) {
    const self = db.employees.find((e) => e.id === session.employeeId);
    return self ? [self] : [];
  }
  return [];
}

/** Planning opérationnel — prénom/rôle seulement pour manager, pas de taux horaire */
export function getEmployeesForPlanning(db: Database, session: Session): Pick<Employee, "id" | "firstName" | "lastName" | "role" | "active">[] {
  if (session.role === "gerant" || session.role === "manager") {
    return db.employees
      .filter((e) => e.active)
      .map(({ id, firstName, lastName, role, active }) => ({
        id,
        firstName,
        lastName,
        role,
        active,
      }));
  }
  if (session.role === "employe" && session.employeeId) {
    const self = db.employees.find((e) => e.id === session.employeeId);
    return self ? [{ id: self.id, firstName: self.firstName, lastName: self.lastName, role: self.role, active: self.active }] : [];
  }
  return [];
}

/** Publication (validation) d'une semaine de planning, si elle a eu lieu. */
export function getPlanningPublication(
  db: Database,
  weekStart: string
): PlanningPublication | undefined {
  return (db.planningPublications ?? []).find((p) => p.weekStart === weekStart);
}

export function isWeekPublished(db: Database, weekStart: string): boolean {
  return getPlanningPublication(db, weekStart) !== undefined;
}

/** Le gérant et le manager voient tout le planning, y compris les semaines en
 *  cours de construction. L'employé ne voit que ses propres créneaux, et
 *  uniquement sur les semaines que le responsable a validées. */
export function getShiftSlotsForSession(db: Database, session: Session): ShiftSlot[] {
  if (session.role === "employe" && session.employeeId) {
    const published = new Set((db.planningPublications ?? []).map((p) => p.weekStart));
    return db.shiftSlots.filter(
      (s) => s.employeeId === session.employeeId && published.has(s.weekStart)
    );
  }
  if (session.role === "gerant" || session.role === "manager") return db.shiftSlots;
  return [];
}

export function getAvailabilitiesForSession(db: Database, session: Session): Availability[] {
  if (session.role === "employe" && session.employeeId) {
    return db.availabilities.filter((a) => a.employeeId === session.employeeId);
  }
  if (session.role === "gerant" || session.role === "manager") return db.availabilities;
  return [];
}

export function getTimeEntriesForSession(db: Database, session: Session): TimeEntry[] {
  if (session.role === "employe" && session.employeeId) {
    return db.timeEntries.filter((t) => t.employeeId === session.employeeId);
  }
  if (session.role === "gerant" || session.role === "manager") return db.timeEntries;
  return [];
}

export function getReplacementOffersForSession(
  db: Database,
  session: Session
): ReplacementOffer[] {
  if (session.role === "employe" && session.employeeId) {
    return db.replacementOffers.filter((o) => o.targetEmployeeId === session.employeeId);
  }
  if (session.role === "gerant" || session.role === "manager") return db.replacementOffers;
  return [];
}

export function getShiftUnavailabilitiesForSession(db: Database, session: Session) {
  if (session.role === "employe" && session.employeeId) {
    return db.shiftUnavailabilities.filter((u) => u.employeeId === session.employeeId);
  }
  if (session.role === "gerant" || session.role === "manager") return db.shiftUnavailabilities;
  return [];
}

/** Absences sans identifier le collègue pour les employés */
export function getAbsencesForSession(
  db: Database,
  session: Session
): (Absence & { anonymous?: boolean })[] {
  if (session.role === "employe") {
    return db.absences
      .filter((a) => a.replacementRequested)
      .map((a) => ({ ...a, employeeId: "anonymous", anonymous: true }));
  }
  return db.absences;
}

export function getNotificationsForSession(
  db: Database,
  session: Session
): Notification[] {
  const allowedTypes: Record<Session["role"], Notification["type"][]> = {
    superadmin: [],
    gerant: ["staffing", "stock", "expiry", "replacement", "planning", "compliance", "reservation", "general"],
    manager: ["staffing", "stock", "expiry", "replacement", "planning", "compliance", "reservation", "general"],
    employe: ["replacement", "planning", "general"],
  };
  const types = allowedTypes[session.role];
  return db.notifications.filter(
    (n) =>
      n.targetRoles.includes(session.role) &&
      types.includes(n.type) &&
      (!n.targetUserId || n.targetUserId === session.userId)
  );
}

export function getStockItemsForSession(db: Database, session: Session): StockItem[] {
  if (session.role === "employe") return [];
  return db.stockItems;
}

export function getSuppliersForSession(db: Database, session: Session): Supplier[] {
  if (session.role === "employe") return [];
  return db.suppliers;
}

export function getPriceHistoryForSession(db: Database, session: Session): PriceHistory[] {
  if (session.role !== "gerant" && session.role !== "manager") return [];
  return db.priceHistory;
}

export function getSalesForSession(db: Database, session: Session): Sale[] {
  if (session.role !== "gerant") return [];
  return db.sales;
}

export function getCashFlowForSession(db: Database, session: Session): CashFlowEntry[] {
  if (session.role !== "gerant") return [];
  return db.cashFlow;
}

export function stripEmployeeForManager(emp: Employee): Employee {
  return {
    ...emp,
    hourlyRate: 0,
    hrNotes: "",
    phone: "—",
    email: "—",
    documents: [],
  };
}

export function getEmployeeDisplayName(
  db: Database,
  employeeId: string,
  session: Session
): string {
  if (session.role === "employe" && employeeId !== session.employeeId) {
    return "Collègue";
  }
  const emp = db.employees.find((e) => e.id === employeeId);
  return emp ? `${emp.firstName} ${emp.lastName}` : "Inconnu";
}

export function getPersonalDataExport(db: Database, session: Session) {
  if (!session.employeeId) return null;
  const emp = db.employees.find((e) => e.id === session.employeeId);
  if (!emp) return null;
  return {
    identity: { firstName: emp.firstName, lastName: emp.lastName, email: emp.email, phone: emp.phone },
    contract: { type: emp.contractType, startDate: emp.startDate },
    trainings: emp.trainings,
    documents: emp.documents.map((d) => d.name),
    availabilities: db.availabilities.filter((a) => a.employeeId === session.employeeId),
    timeEntries: db.timeEntries.filter((t) => t.employeeId === session.employeeId),
    shiftSlots: db.shiftSlots.filter((s) => s.employeeId === session.employeeId),
  };
}
