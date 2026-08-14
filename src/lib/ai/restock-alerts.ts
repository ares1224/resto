import type { Database, Supplier, SupplierOrderDraftLine } from "@/types";

export function buildSupplierGreeting(supplier: Supplier): string {
  const contact = supplier.contact?.trim();
  if (contact) return `Bonjour ${contact},`;
  return `Bonjour à l'équipe de ${supplier.name},`;
}

export function buildDraftMessage(
  supplier: Supplier,
  lines: SupplierOrderDraftLine[],
  restaurantName: string
): string {
  const greeting = buildSupplierGreeting(supplier);
  const name = restaurantName.trim() || "Notre établissement";

  let productBlock: string;
  if (lines.length === 0) {
    productBlock = `Nous souhaitons passer commande auprès de ${supplier.name}.\n\nMerci de nous indiquer vos disponibilités et délais de livraison.`;
  } else {
    const productLines = lines
      .map(
        (l) =>
          `- ${l.productName} : ${l.suggestedQuantity} ${l.unit} (stock actuel : ${l.currentQuantity} ${l.unit})`
      )
      .join("\n");
    productBlock = `Nous souhaitons passer commande auprès de ${supplier.name} :\n\n${productLines}\n\nMerci de confirmer la disponibilité et la date de livraison.`;
  }

  return `${greeting}

${productBlock}

Cordialement,
${name}`;
}

export function getLowStockItemsBySupplier(db: Database): Map<string, Database["stockItems"]> {
  const lowBySupplier = new Map<string, Database["stockItems"]>();
  for (const item of db.stockItems) {
    if (item.quantity <= item.minThreshold) {
      const list = lowBySupplier.get(item.supplierId) ?? [];
      list.push(item);
      lowBySupplier.set(item.supplierId, list);
    }
  }
  return lowBySupplier;
}

export function linesFromStockItems(
  items: Database["stockItems"],
  lowStockOnly = false
): SupplierOrderDraftLine[] {
  const filtered = lowStockOnly
    ? items.filter((item) => item.quantity <= item.minThreshold)
    : items;

  return filtered.map((item) => ({
    stockItemId: item.id,
    productName: item.name,
    currentQuantity: item.quantity,
    suggestedQuantity:
      item.quantity <= item.minThreshold
        ? Math.max(item.minThreshold * 2 - item.quantity, 1)
        : Math.max(item.minThreshold, 1),
    unit: item.unit,
  }));
}

export function composeDraftForSupplier(
  db: Database,
  supplierId: string,
  options?: { lowStockOnly?: boolean; lines?: SupplierOrderDraftLine[] }
) {
  if (!db.supplierOrderDrafts) db.supplierOrderDrafts = [];

  const supplier = db.suppliers.find((s) => s.id === supplierId);
  if (!supplier) return null;

  const items = db.stockItems.filter((s) => s.supplierId === supplierId);
  const lines =
    options?.lines ??
    linesFromStockItems(items, options?.lowStockOnly ?? false);

  const draftMessage = buildDraftMessage(supplier, lines, db.settings.restaurantName);
  const now = new Date().toISOString();

  let draft = db.supplierOrderDrafts.find(
    (d) => d.supplierId === supplierId && d.status === "pending"
  );

  if (draft) {
    draft.lines = lines;
    draft.draftMessage = draftMessage;
    draft.updatedAt = now;
  } else {
    draft = {
      id: crypto.randomUUID(),
      supplierId,
      lines,
      draftMessage,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    db.supplierOrderDrafts.unshift(draft);
  }

  return draft;
}

export function generateSupplierOrderDrafts(db: Database): void {
  if (!db.supplierOrderDrafts) db.supplierOrderDrafts = [];

  const lowBySupplier = getLowStockItemsBySupplier(db);

  for (const draft of db.supplierOrderDrafts) {
    if (draft.status === "pending" && !lowBySupplier.has(draft.supplierId)) {
      draft.status = "cancelled";
      draft.updatedAt = new Date().toISOString();
    }
  }

  for (const [supplierId, items] of lowBySupplier) {
    const supplier = db.suppliers.find((s) => s.id === supplierId);
    if (!supplier) continue;

    const lines = linesFromStockItems(items);
    const draftMessage = buildDraftMessage(supplier, lines, db.settings.restaurantName);
    const now = new Date().toISOString();
    const existing = db.supplierOrderDrafts.find(
      (d) => d.supplierId === supplierId && d.status === "pending"
    );

    if (existing) {
      existing.lines = lines;
      existing.draftMessage = draftMessage;
      existing.updatedAt = now;
      continue;
    }

    const draftId = crypto.randomUUID();
    db.supplierOrderDrafts.unshift({
      id: draftId,
      supplierId,
      lines,
      draftMessage,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const summary = lines
      .map((l) => `${l.productName} (${l.currentQuantity} ${l.unit} restant(s))`)
      .join(", ");
    const title = `Commande à valider — ${supplier.name}`;
    const exists = db.notifications.some((n) => n.title === title && !n.read && n.type === "stock");
    if (!exists) {
      db.notifications.unshift({
        id: crypto.randomUUID(),
        type: "stock",
        title,
        message: `Stock presque épuisé : ${summary}. Un brouillon de commande a été préparé — validez-le avant envoi au fournisseur.`,
        severity: lines.some((l) => l.currentQuantity <= 0) ? "critical" : "warning",
        read: false,
        createdAt: now,
        targetRoles: ["gerant", "manager"],
        actionHref: "/stocks/commandes",
      });
    }
  }
}

export function processInventoryChange(db: Database): void {
  generateSupplierOrderDrafts(db);
}

export function rebuildDraftMessage(db: Database, draftId: string): void {
  const draft = db.supplierOrderDrafts.find((d) => d.id === draftId);
  if (!draft || draft.status !== "pending") return;
  const supplier = db.suppliers.find((s) => s.id === draft.supplierId);
  if (!supplier) return;
  draft.draftMessage = buildDraftMessage(supplier, draft.lines, db.settings.restaurantName);
  draft.updatedAt = new Date().toISOString();
}
