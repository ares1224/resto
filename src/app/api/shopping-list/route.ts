import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";

export async function POST(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();

    const id = crypto.randomUUID();
    await updateDb((db) => {
      db.shoppingList.push({
        id,
        stockItemId: body.stockItemId || undefined,
        customName: body.customName?.trim() || undefined,
        supplierId: body.supplierId || undefined,
        suggestedQty: Number(body.suggestedQty) || 1,
        reason: body.reason?.trim() || "Ajout manuel",
        ordered: false,
        manual: true,
      });
    });

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();
    const { id } = body;

    await updateDb((db) => {
      const item = db.shoppingList.find((s) => s.id === id);
      if (!item) return;

      if (body.action === "update") {
        if (body.stockItemId !== undefined) {
          item.stockItemId = body.stockItemId || undefined;
          if (body.stockItemId) {
            const stock = db.stockItems.find((s) => s.id === body.stockItemId);
            if (stock && !body.supplierId) item.supplierId = stock.supplierId;
          }
        }
        if (body.customName !== undefined) item.customName = body.customName?.trim() || undefined;
        if (body.supplierId !== undefined) item.supplierId = body.supplierId || undefined;
        if (body.suggestedQty !== undefined) item.suggestedQty = Number(body.suggestedQty);
        if (body.reason !== undefined) item.reason = body.reason?.trim() || item.reason;
        item.manual = true;
        return;
      }

      if (typeof body.ordered === "boolean") {
        item.ordered = body.ordered;
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const { id } = await request.json();
    await updateDb((db) => {
      db.shoppingList = db.shoppingList.filter((s) => s.id !== id);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
