import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";
import { logAudit } from "@/lib/audit";
import { regenerateShoppingList } from "@/lib/business";

function deleteSupplier(db: Parameters<Parameters<typeof updateDb>[0]>[0], supplierId: string): string | null {
  const linked = db.stockItems.filter((s) => s.supplierId === supplierId);
  if (linked.length > 0) {
    return `Ce fournisseur est lié à ${linked.length} produit(s) — réassignez-les avant suppression.`;
  }
  db.suppliers = db.suppliers.filter((s) => s.id !== supplierId);
  db.priceHistory = db.priceHistory.filter((p) => p.supplierId !== supplierId);
  db.supplierOrderDrafts = (db.supplierOrderDrafts ?? []).filter((d) => d.supplierId !== supplierId);
  return null;
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiPermission("edit_stocks");
    const body = await request.json();
    await updateDb((db) => {
      const supplier = db.suppliers.find((s) => s.id === body.id);
      if (!supplier) return;
      supplier.name = body.name ?? supplier.name;
      supplier.contact = body.contact ?? supplier.contact;
      supplier.phone = body.phone ?? supplier.phone;
      supplier.email = body.email ?? supplier.email;
      supplier.deliveryDays = body.deliveryDays ?? supplier.deliveryDays;
      supplier.reliabilityScore = body.reliabilityScore ?? supplier.reliabilityScore;
      supplier.notes = body.notes ?? supplier.notes;
    });
    await logAudit(session, "supplier_update", `Fournisseur ${body.name ?? body.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiPermission("edit_stocks");
    const { id } = await request.json();
    let error: string | null = null;
    await updateDb((db) => {
      error = deleteSupplier(db, id);
    });
    if (error) return NextResponse.json({ error }, { status: 400 });
    await logAudit(session, "supplier_delete", `Fournisseur ${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("edit_stocks");
    const body = await request.json();

    const id = crypto.randomUUID();
    await updateDb((db) => {
      db.suppliers.push({
        id,
        name: body.name,
        contact: body.contact ?? "",
        phone: body.phone ?? "",
        email: body.email ?? "",
        deliveryDays: body.deliveryDays ?? 2,
        reliabilityScore: body.reliabilityScore ?? 4,
        notes: body.notes ?? "",
      });
      regenerateShoppingList(db);
    });

    await logAudit(session, "supplier_create", `Fournisseur ${body.name}`);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return apiError(e);
  }
}
