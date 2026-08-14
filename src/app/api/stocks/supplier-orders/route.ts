import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import {
  composeDraftForSupplier,
  getLowStockItemsBySupplier,
  rebuildDraftMessage,
} from "@/lib/ai/restock-alerts";
import { logAudit } from "@/lib/audit";
import type { SupplierOrderDraftLine } from "@/types";

function enrichDraft(
  db: Awaited<ReturnType<typeof getDb>>,
  draft: NonNullable<ReturnType<typeof composeDraftForSupplier>>
) {
  const supplier = db.suppliers.find((s) => s.id === draft.supplierId);
  const lowBySupplier = getLowStockItemsBySupplier(db);
  const allItems = db.stockItems.filter((s) => s.supplierId === draft.supplierId);
  const selectedIds = new Set(draft.lines.map((l) => l.stockItemId));

  return {
    ...draft,
    supplierName: supplier?.name ?? "Fournisseur",
    supplierEmail: supplier?.email ?? "",
    supplierContact: supplier?.contact ?? "",
    isUrgent: (lowBySupplier.get(draft.supplierId)?.length ?? 0) > 0,
    allProducts: allItems.map((item) => {
      const inDraft = draft.lines.find((l) => l.stockItemId === item.id);
      return {
        stockItemId: item.id,
        productName: item.name,
        currentQuantity: item.quantity,
        suggestedQuantity:
          inDraft?.suggestedQuantity ??
          (item.quantity <= item.minThreshold
            ? Math.max(item.minThreshold * 2 - item.quantity, 1)
            : Math.max(item.minThreshold, 1)),
        unit: item.unit,
        selected: selectedIds.has(item.id),
        isLowStock: item.quantity <= item.minThreshold,
      };
    }),
  };
}

export async function GET() {
  try {
    await requireApiPermission("view_stocks");
    const db = await getDb();
    const lowBySupplier = getLowStockItemsBySupplier(db);

    const urgentSuppliers = db.suppliers
      .filter((s) => (lowBySupplier.get(s.id)?.length ?? 0) > 0)
      .map((s) => {
        const items = lowBySupplier.get(s.id) ?? [];
        const draft = (db.supplierOrderDrafts ?? []).find(
          (d) => d.supplierId === s.id && d.status === "pending"
        );
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          contact: s.contact,
          lowStockCount: items.length,
          draftId: draft?.id,
          products: items.map((item) => ({
            stockItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            minThreshold: item.minThreshold,
            unit: item.unit,
          })),
        };
      });

    const allSuppliers = db.suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      contact: s.contact,
      productCount: db.stockItems.filter((i) => i.supplierId === s.id).length,
      hasLowStock: (lowBySupplier.get(s.id)?.length ?? 0) > 0,
    }));

    const pending = (db.supplierOrderDrafts ?? [])
      .filter((d) => d.status === "pending")
      .map((d) => enrichDraft(db, d));

    return NextResponse.json({
      urgentSuppliers,
      allSuppliers,
      pendingDrafts: pending,
      restaurantName: db.settings.restaurantName,
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();
    const { id, draftMessage, lines } = body;

    await updateDb((db) => {
      const draft = db.supplierOrderDrafts?.find((d) => d.id === id);
      if (!draft || draft.status !== "pending") return;
      if (typeof draftMessage === "string") draft.draftMessage = draftMessage;
      if (Array.isArray(lines)) {
        draft.lines = lines.map(
          (l: SupplierOrderDraftLine) => ({
            stockItemId: l.stockItemId,
            productName: l.productName,
            currentQuantity: l.currentQuantity,
            suggestedQuantity: Number(l.suggestedQuantity),
            unit: l.unit,
          })
        );
        rebuildDraftMessage(db, id);
      }
      draft.updatedAt = new Date().toISOString();
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("edit_stocks");
    const body = await request.json();

    if (body.action === "compose") {
      let result: ReturnType<typeof enrichDraft> | null = null;
      await updateDb((db) => {
        const supplierId = body.supplierId as string;
        const supplierItems = db.stockItems.filter((s) => s.supplierId === supplierId);
        const draft = composeDraftForSupplier(db, supplierId, {
          lowStockOnly: body.lowStockOnly === true,
          lines: body.lines as SupplierOrderDraftLine[] | undefined,
        });
        if (!draft) return;
        if (body.lowStockOnly && supplierItems.length > 0 && draft.lines.length === 0) {
          const fallback = composeDraftForSupplier(db, supplierId, { lowStockOnly: true });
          if (fallback) result = enrichDraft(db, fallback);
          return;
        }
        result = enrichDraft(db, draft);
      });
      if (!result) {
        return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (body.action === "send") {
      let result: { ok: boolean; sentTo?: string; error?: string } = { ok: false };

      await updateDb((db) => {
        const draft = db.supplierOrderDrafts?.find((d) => d.id === body.id);
        if (!draft || draft.status !== "pending") {
          result = { ok: false, error: "Brouillon introuvable ou déjà traité" };
          return;
        }
        const supplier = db.suppliers.find((s) => s.id === draft.supplierId);
        if (!supplier?.email) {
          result = { ok: false, error: "Aucun email renseigné pour ce fournisseur" };
          return;
        }

        const message = body.draftMessage ?? draft.draftMessage;
        draft.draftMessage = message;
        draft.status = "sent";
        draft.sentAt = new Date().toISOString();
        draft.sentTo = supplier.email;
        draft.sentByUserId = session.userId;
        draft.updatedAt = draft.sentAt;

        for (const line of draft.lines) {
          const shop = db.shoppingList.find((s) => s.stockItemId === line.stockItemId);
          if (shop) shop.ordered = true;
        }

        db.notifications.unshift({
          id: crypto.randomUUID(),
          type: "general",
          title: "Commande fournisseur envoyée",
          message: `Message transmis à ${supplier.name} (${supplier.email})${draft.lines.length ? ` pour ${draft.lines.length} produit(s)` : ""}.`,
          severity: "info",
          read: false,
          createdAt: draft.sentAt,
          targetRoles: ["gerant", "manager"],
        });

        result = { ok: true, sentTo: supplier.email };
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await logAudit(session, "supplier_order_sent", `Commande ${body.id} → ${result.sentTo}`);
      return NextResponse.json({ ok: true, sentTo: result.sentTo });
    }

    if (body.action === "cancel") {
      await updateDb((db) => {
        const draft = db.supplierOrderDrafts?.find((d) => d.id === body.id);
        if (draft && draft.status === "pending") {
          draft.status = "cancelled";
          draft.updatedAt = new Date().toISOString();
        }
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
