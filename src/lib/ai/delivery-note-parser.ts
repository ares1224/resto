import type { Database, StockFieldDefinition } from "@/types";

export type DeliveryNoteCustomField = {
  key: string;
  label: string;
  value: string;
  isNewField: boolean;
};

export type ParsedDeliveryLine = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  expiryDate?: string;
  category?: string;
  customFields: DeliveryNoteCustomField[];
  matchedStockItemId: string | null;
  matchedStockItemName: string | null;
  action: "update" | "create";
  confidence: "high" | "medium" | "low";
};

export type DeliveryNoteParseResult = {
  supplierName?: string;
  deliveryDate?: string;
  lines: ParsedDeliveryLine[];
  newFieldDefinitions: { key: string; label: string }[];
  rawTextPreview: string;
};

const STANDARD_FIELD_LABELS = new Set([
  "nom",
  "produit",
  "quantite",
  "quantité",
  "qte",
  "qté",
  "unite",
  "unité",
  "prix",
  "dlc",
  "ddm",
  "peremption",
  "péremption",
  "date",
  "fournisseur",
  "livraison",
  "reference",
  "référence",
  "ref",
  "total",
  "tva",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(label: string): string {
  return normalize(label).replace(/\s+/g, "_").slice(0, 40);
}

function parseNumber(value: string): number | undefined {
  const n = parseFloat(value.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseFrenchDate(text: string): string | undefined {
  const dmy = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return undefined;
}

function matchStockItem(db: Database, productName: string): { id: string; name: string } | null {
  const n = normalize(productName);
  if (!n) return null;
  const exact = db.stockItems.find((s) => normalize(s.name) === n);
  if (exact) return { id: exact.id, name: exact.name };
  const contains = db.stockItems.filter(
    (s) => normalize(s.name).includes(n) || n.includes(normalize(s.name))
  );
  if (contains.length === 1) return { id: contains[0].id, name: contains[0].name };
  if (contains.length > 1) {
    const best = contains.sort((a, b) => normalize(a.name).length - normalize(b.name).length)[0];
    return { id: best.id, name: best.name };
  }
  const words = n.split(" ").filter((w) => w.length > 2);
  for (const item of db.stockItems) {
    const iname = normalize(item.name);
    if (words.every((w) => iname.includes(w))) return { id: item.id, name: item.name };
  }
  return null;
}

function extractSupplier(text: string): string | undefined {
  const m = text.match(/(?:fournisseur|societe|société|vendeur)\s*[:\-]\s*(.+)/i);
  return m?.[1]?.trim().split("\n")[0];
}

function extractDeliveryDate(text: string): string | undefined {
  const m = text.match(
    /(?:date\s*(?:de\s*)?livraison|livré le|livraison du|bon de livraison du)\s*[:\-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i
  );
  if (m) return parseFrenchDate(m[1]);
  return parseFrenchDate(text.slice(0, 200));
}

function parseProductLine(
  line: string,
  db: Database,
  existingFieldKeys: Set<string>
): ParsedDeliveryLine | null {
  const trimmed = line.trim();
  if (trimmed.length < 3) return null;
  if (/^(total|sous.?total|tva|ht|ttc|merci|page\s+\d)/i.test(trimmed)) return null;

  const tabParts = trimmed.split(/\t+/).map((p) => p.trim()).filter(Boolean);
  if (tabParts.length >= 2) {
    const name = tabParts[0];
    const qtyMatch = tabParts.find((p) => /^\d+[.,]?\d*$/.test(p));
    const unitMatch = tabParts.find((p) => /^(kg|g|l|ml|cl|unité|unités|u|pièce|pièces|btl)$/i.test(p));
    const priceMatch = tabParts.find((p) => /\d+[.,]\d{2}\s*€?/.test(p));
    const qty = qtyMatch ? parseNumber(qtyMatch) : undefined;
    if (name && qty !== undefined) {
      return buildLine(name, qty, unitMatch ?? "unité", priceMatch ? parseNumber(priceMatch) : undefined, db, existingFieldKeys);
    }
  }

  const pattern =
    /^(.+?)\s+(\d+[.,]?\d*)\s*(kg|g|l|ml|cl|unités?|unité|u|pièces?|btl?s?)?\s*(?:x\s*)?(\d+[.,]?\d*)?\s*€?/i;
  const m = trimmed.match(pattern);
  if (m) {
    const name = m[1].trim();
    const qty = parseNumber(m[2]) ?? 0;
    const unit = m[3]?.toLowerCase() ?? "unité";
    const price = m[4] ? parseNumber(m[4]) : undefined;
    if (name.length >= 2 && qty > 0) {
      return buildLine(name, qty, unit, price, db, existingFieldKeys, trimmed);
    }
  }

  return null;
}

function buildLine(
  productName: string,
  quantity: number,
  unit: string,
  unitPrice: number | undefined,
  db: Database,
  existingFieldKeys: Set<string>,
  fullLine?: string
): ParsedDeliveryLine {
  const customFields: DeliveryNoteCustomField[] = [];
  let expiryDate: string | undefined;

  if (fullLine) {
    const dlc = fullLine.match(/(?:dlc|ddm|péremption|peremption|exp)\s*[:\-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i);
    if (dlc) expiryDate = parseFrenchDate(dlc[1]);

    const extras = fullLine.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/]{2,20})\s*[:\-]\s*([^;|]+)/g);
    for (const ex of extras) {
      const label = ex[1].trim();
      const value = ex[2].trim();
      const keyNorm = normalize(label);
      if (STANDARD_FIELD_LABELS.has(keyNorm) || value.length === 0) continue;
      if (/dlc|ddm|peremption|péremption/i.test(label)) continue;
      const key = slugify(label);
      customFields.push({
        key,
        label,
        value,
        isNewField: !existingFieldKeys.has(key),
      });
    }
  }

  const match = matchStockItem(db, productName);
  let confidence: ParsedDeliveryLine["confidence"] = "low";
  if (match) {
    confidence = normalize(match.name) === normalize(productName) ? "high" : "medium";
  }

  return {
    id: crypto.randomUUID(),
    productName,
    quantity,
    unit: unit === "u" ? "unité" : unit,
    unitPrice,
    expiryDate,
    customFields,
    matchedStockItemId: match?.id ?? null,
    matchedStockItemName: match?.name ?? null,
    action: match ? "update" : "create",
    confidence,
  };
}

function collectMetadataLines(
  lines: string[],
  existingFieldKeys: Set<string>
): DeliveryNoteCustomField[] {
  const meta: DeliveryNoteCustomField[] = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s/]{2,24})\s*[:\-]\s*(.+)$/);
    if (!m) continue;
    const label = m[1].trim();
    const value = m[2].trim();
    if (STANDARD_FIELD_LABELS.has(normalize(label))) continue;
    if (/^\d+[.,]?\d*\s*(kg|g|l)/i.test(line)) continue;
    const key = slugify(label);
    meta.push({ key, label, value, isNewField: !existingFieldKeys.has(key) });
  }
  return meta;
}

export function parseDeliveryNoteText(db: Database, rawText: string): DeliveryNoteParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const existingFieldKeys = new Set([
    ...(db.stockFieldDefinitions ?? []).map((f) => f.key),
    ...db.stockItems.flatMap((s) => Object.keys(s.customFields ?? {})),
  ]);

  const parsedLines: ParsedDeliveryLine[] = [];
  for (const line of lines) {
    const parsed = parseProductLine(line, db, existingFieldKeys);
    if (parsed) parsedLines.push(parsed);
  }

  const globalMeta = collectMetadataLines(lines, existingFieldKeys);
  const newFieldDefinitions: { key: string; label: string }[] = [];
  const seenKeys = new Set<string>();

  for (const field of [...parsedLines.flatMap((l) => l.customFields), ...globalMeta]) {
    if (!field.isNewField || seenKeys.has(field.key)) continue;
    seenKeys.add(field.key);
    newFieldDefinitions.push({ key: field.key, label: field.label });
    existingFieldKeys.add(field.key);
  }

  if (parsedLines.length === 0 && rawText.trim().length > 0) {
    parsedLines.push({
      id: crypto.randomUUID(),
      productName: "Produit à identifier",
      quantity: 1,
      unit: "unité",
      customFields: globalMeta,
      matchedStockItemId: null,
      matchedStockItemName: null,
      action: "create",
      confidence: "low",
    });
  }

  return {
    supplierName: extractSupplier(rawText),
    deliveryDate: extractDeliveryDate(rawText),
    lines: parsedLines,
    newFieldDefinitions,
    rawTextPreview: rawText.slice(0, 500),
  };
}

export function ensureFieldDefinitions(
  db: Database,
  defs: { key: string; label: string }[]
): StockFieldDefinition[] {
  if (!db.stockFieldDefinitions) db.stockFieldDefinitions = [];
  const added: StockFieldDefinition[] = [];
  for (const def of defs) {
    if (db.stockFieldDefinitions.some((f) => f.key === def.key)) continue;
    const field: StockFieldDefinition = {
      id: crypto.randomUUID(),
      key: def.key,
      label: def.label,
      createdAt: new Date().toISOString(),
    };
    db.stockFieldDefinitions.push(field);
    added.push(field);
  }
  return added;
}

export type ApplyDeliveryLineInput = {
  lineId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  expiryDate?: string;
  category?: string;
  supplierId?: string;
  stockItemId?: string | null;
  action: "update" | "create";
  customFields?: Record<string, string>;
  enabled: boolean;
};

export function applyDeliveryNote(
  db: Database,
  input: {
    lines: ApplyDeliveryLineInput[];
    newFieldDefinitions: { key: string; label: string }[];
    defaultSupplierId?: string;
    addToExistingQuantity?: boolean;
  }
): { updated: number; created: number; skipped: number } {
  ensureFieldDefinitions(db, input.newFieldDefinitions);
  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const line of input.lines) {
    if (!line.enabled) {
      skipped++;
      continue;
    }

    const customFields = line.customFields ?? {};

    if (line.action === "update" && line.stockItemId) {
      const item = db.stockItems.find((s) => s.id === line.stockItemId);
      if (!item) {
        skipped++;
        continue;
      }
      if (input.addToExistingQuantity !== false) {
        item.quantity += line.quantity;
      } else {
        item.quantity = line.quantity;
      }
      if (line.unitPrice !== undefined) item.unitPrice = line.unitPrice;
      if (line.expiryDate) item.expiryDate = line.expiryDate;
      if (line.unit) item.unit = line.unit;
      item.customFields = { ...(item.customFields ?? {}), ...customFields };
      updated++;
      continue;
    }

    const supplierId = line.supplierId || input.defaultSupplierId;
    if (!supplierId) {
      skipped++;
      continue;
    }

    const id = crypto.randomUUID();
    db.stockItems.push({
      id,
      name: line.productName,
      category: line.category ?? "Autre",
      unit: line.unit || "unité",
      quantity: line.quantity,
      minThreshold: 1,
      supplierId,
      unitPrice: line.unitPrice ?? 0,
      expiryDate: line.expiryDate,
      fifoOrder: db.stockItems.length + 1,
      customFields,
    });
    created++;
  }

  return { updated, created, skipped };
}
