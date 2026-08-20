export type Role = "superadmin" | "gerant" | "manager" | "employe";

export type RestaurantStatus = "pending" | "active" | "inactive";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  cuisineType: string;
  phone: string;
  contactEmail: string;
  status: RestaurantStatus;
  createdAt: string;
  emailConfirmedAt?: string;
};

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  restaurantId?: string;
  employeeId?: string;
  emailConfirmed?: boolean;
  emailConfirmToken?: string;
  emailConfirmTokenExpires?: string;
  mustChangePassword?: boolean;
  passwordSetupToken?: string;
  passwordSetupTokenExpires?: string;
};

export type PlatformNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  restaurantId?: string;
};

export type OutboundEmail = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  sent: boolean;
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  contractType: "CDI" | "CDD" | "extra";
  hourlyRate: number;
  weeklyMaxHours: number;
  phone: string;
  email: string;
  startDate: string;
  documents: { name: string; url: string; uploadedAt: string }[];
  trainings: { title: string; date: string; validUntil?: string }[];
  hrNotes: string;
  active: boolean;
};

export type Availability = {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  available: boolean;
};

export type ShiftSlot = {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isPeak: boolean;
  weekStart: string;
};

/** Validation d'une semaine de planning par le gérant ou le manager. Tant qu'une
 *  semaine n'est pas publiée, les employés ne la voient pas dans leur espace. */
export type PlanningPublication = {
  weekStart: string;
  publishedAt: string;
  publishedByUserId: string;
};

export type Absence = {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
  replacementRequested: boolean;
};

export type ReplacementOffer = {
  id: string;
  shiftSlotId: string;
  targetEmployeeId: string;
  sentByUserId: string;
  status: "pending" | "accepted" | "declined";
  notifiedAt: string;
  weekStart: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roleLabel: string;
  respondedAt?: string;
};

export type ShiftUnavailability = {
  id: string;
  employeeId: string;
  shiftSlotId: string;
  weekStart: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  reason: string;
  status: "pending" | "acknowledged";
  createdAt: string;
};

export type QrClockToken = {
  id: string;
  employeeId: string;
  token: string;
  expiresAt: string;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: "planned" | "clocked_in" | "completed" | "absent";
  method?: "manual" | "qr";
  clockInStatus?: "on_time" | "early" | "late";
  clockOutStatus?: "on_time" | "early" | "late";
};

export type SupplierOrderDraftLine = {
  stockItemId: string;
  productName: string;
  currentQuantity: number;
  suggestedQuantity: number;
  unit: string;
};

export type SupplierOrderDraft = {
  id: string;
  supplierId: string;
  lines: SupplierOrderDraftLine[];
  draftMessage: string;
  status: "pending" | "sent" | "cancelled";
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  sentTo?: string;
  sentByUserId?: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  deliveryDays: number;
  reliabilityScore: number;
  notes: string;
};

export type StockFieldDefinition = {
  id: string;
  key: string;
  label: string;
  createdAt: string;
};

export type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minThreshold: number;
  supplierId: string;
  unitPrice: number;
  expiryDate?: string;
  fifoOrder: number;
  customFields?: Record<string, string>;
};

export type PriceHistory = {
  id: string;
  stockItemId: string;
  supplierId: string;
  price: number;
  date: string;
};

export type WasteEntry = {
  id: string;
  stockItemId: string;
  quantity: number;
  value: number;
  reason: string;
  date: string;
};

export type Ingredient = {
  id: string;
  name: string;
  stockItemId: string;
  allergens: string[];
};

export type Recipe = {
  id: string;
  menuItemId: string;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  isDailySpecial: boolean;
  allergens: string[];
};

export type Sale = {
  id: string;
  menuItemId: string;
  quantity: number;
  date: string;
  revenue: number;
};

export type CashFlowEntry = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description: string;
  isFixed: boolean;
};

export type Reservation = {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  date: string;
  time: string;
  covers: number;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  reminderSent: boolean;
  notes: string;
};

export type HaccpCheck = {
  id: string;
  type: "temperature" | "cleaning" | "reception";
  label: string;
  value?: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  date: string;
};

export type ComplianceReminder = {
  id: string;
  title: string;
  dueDate: string;
  category: string;
  completed: boolean;
};

export type Equipment = {
  id: string;
  name: string;
  location: string;
  status: "ok" | "maintenance" | "broken";
  lastMaintenance: string;
  nextMaintenance: string;
  contractProvider?: string;
  incidents: { date: string; description: string; resolved: boolean }[];
};

export type ShiftLog = {
  id: string;
  shift: "midi" | "soir";
  date: string;
  authorId: string;
  incidents: string;
  handoverNotes: string;
  createdAt: string;
};

export type TrafficStat = {
  id: string;
  date: string;
  hour: number;
  covers: number;
};

export type Notification = {
  id: string;
  type:
    | "staffing"
    | "stock"
    | "expiry"
    | "replacement"
    | "planning"
    | "compliance"
    | "reservation"
    | "general";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  read: boolean;
  createdAt: string;
  targetRoles: Role[];
  targetUserId?: string;
  actionHref?: string;
  actionLabel?: string;
};

export type ShoppingListItem = {
  id: string;
  stockItemId?: string;
  customName?: string;
  supplierId?: string;
  suggestedQty: number;
  reason: string;
  ordered: boolean;
  manual?: boolean;
};

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  details: string;
  createdAt: string;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AiChatSession = {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type GerantAiChat = {
  userId: string;
  activeSessionId: string;
  sessions: AiChatSession[];
  /** @deprecated legacy flat messages — migrated on read */
  messages?: AiChatMessage[];
  updatedAt?: string;
};

export type ManagerPermissions = {
  planning: boolean;
  stocks: boolean;
  hygiene: boolean;
  clientele: boolean;
  operations: boolean;
  marketing: boolean;
  foodCost: boolean;
};

export type Database = {
  users: User[];
  employees: Employee[];
  availabilities: Availability[];
  shiftSlots: ShiftSlot[];
  planningPublications: PlanningPublication[];
  absences: Absence[];
  replacementOffers: ReplacementOffer[];
  shiftUnavailabilities: ShiftUnavailability[];
  qrClockTokens: QrClockToken[];
  timeEntries: TimeEntry[];
  suppliers: Supplier[];
  stockItems: StockItem[];
  stockFieldDefinitions: StockFieldDefinition[];
  priceHistory: PriceHistory[];
  wasteEntries: WasteEntry[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  menuItems: MenuItem[];
  sales: Sale[];
  cashFlow: CashFlowEntry[];
  reservations: Reservation[];
  haccpChecks: HaccpCheck[];
  complianceReminders: ComplianceReminder[];
  equipment: Equipment[];
  shiftLogs: ShiftLog[];
  trafficStats: TrafficStat[];
  notifications: Notification[];
  supplierOrderDrafts: SupplierOrderDraft[];
  shoppingList: ShoppingListItem[];
  auditLog: AuditLog[];
  gerantAiChats: GerantAiChat[];
  settings: {
    restaurantName: string;
    covers: number;
    minRestHours: number;
    maxWeeklyHours: number;
    peakSlots: { dayOfWeek: number; start: string; end: string; minStaff: number }[];
    managerPermissions: ManagerPermissions;
    sessionTimeoutMinutes: number;
    setupComplete?: boolean;
    address?: string;
    cuisineType?: string;
    timezone?: string;
    currency?: string;
    locale?: string;
    setupDraft?: SetupDraft | null;
  };
};

export type PlatformDatabase = {
  version: 2;
  restaurants: Restaurant[];
  superAdmins: User[];
  tenants: Record<string, Database>;
  platformNotifications: PlatformNotification[];
  outboundEmails: OutboundEmail[];
};

export type SetupDraft = {
  step: number;
  restaurantName: string;
  address: string;
  cuisineType: string;
  covers: string;
  name: string;
  email: string;
  password: string;
  timezone: string;
  currency: string;
  locale: string;
};
