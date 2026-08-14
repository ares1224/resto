import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";
import { autoHideMenuFromStock, regenerateShoppingList, runAlertEngine } from "@/lib/business";

function deleteStockItem(db: Parameters<Parameters<typeof updateDb>[0]>[0], itemId: string): string | null {
  const item = db.stockItems.find((s) => s.id === itemId);
  if (!item) return "Produit introuvable";

  const linkedIngredients = db.ingredients.filter((i) => i.stockItemId === itemId);
  const usedInRecipes = linkedIngredients.some((ing) =>
    db.recipes.some((r) => r.ingredients.some((ri) => ri.ingredientId === ing.id))
  );
  if (usedInRecipes) {
    return "Ce produit est utilisé dans une recette — retirez-le de la carte avant suppression.";
  }

  db.stockItems = db.stockItems.filter((s) => s.id !== itemId);
  db.ingredients = db.ingredients.filter((i) => i.stockItemId !== itemId);
  db.wasteEntries = db.wasteEntries.filter((w) => w.stockItemId !== itemId);
  db.priceHistory = db.priceHistory.filter((p) => p.stockItemId !== itemId);
  db.shoppingList = db.shoppingList.filter((s) => s.stockItemId !== itemId);
  autoHideMenuFromStock(db);
  regenerateShoppingList(db);
  runAlertEngine(db);
  return null;
}

export async function PATCH(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();

    if (body.action === "update") {
      await updateDb((db) => {
        const item = db.stockItems.find((s) => s.id === body.id);
        if (!item) return;
        item.name = body.name ?? item.name;
        item.category = body.category ?? item.category;
        item.unit = body.unit ?? item.unit;
        item.quantity = body.quantity ?? item.quantity;
        item.minThreshold = body.minThreshold ?? item.minThreshold;
        item.supplierId = body.supplierId ?? item.supplierId;
        item.unitPrice = body.unitPrice ?? item.unitPrice;
        item.expiryDate = body.expiryDate || undefined;
        item.customFields = body.customFields ?? item.customFields ?? {};
        autoHideMenuFromStock(db);
        regenerateShoppingList(db);
        runAlertEngine(db);
      });
      return NextResponse.json({ ok: true });
    }

    const { itemId, quantity } = body;
    await updateDb((db) => {
      const item = db.stockItems.find((s) => s.id === itemId);
      if (item) item.quantity = quantity;
      autoHideMenuFromStock(db);
      regenerateShoppingList(db);
      runAlertEngine(db);
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
    let error: string | null = null;
    await updateDb((db) => {
      error = deleteStockItem(db, id);
    });
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();

    if (body.action === "create") {
      const id = crypto.randomUUID();
      await updateDb((db) => {
        db.stockItems.push({
          id,
          name: body.name,
          category: body.category ?? "Autre",
          unit: body.unit ?? "unité",
          quantity: body.quantity ?? 0,
          minThreshold: body.minThreshold ?? 1,
          supplierId: body.supplierId,
          unitPrice: body.unitPrice ?? 0,
          expiryDate: body.expiryDate,
          fifoOrder: db.stockItems.length + 1,
          customFields: body.customFields ?? {},
        });
        regenerateShoppingList(db);
        runAlertEngine(db);
      });
      return NextResponse.json({ ok: true, id });
    }

    if (body.action === "delete") {
      let error: string | null = null;
      await updateDb((db) => {
        error = deleteStockItem(db, body.id);
      });
      if (error) return NextResponse.json({ error }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "waste") {
      await updateDb((db) => {
        const item = db.stockItems.find((s) => s.id === body.stockItemId);
        if (!item) return;
        const value = item.unitPrice * body.quantity;
        item.quantity = Math.max(0, item.quantity - body.quantity);
        db.wasteEntries.unshift({
          id: crypto.randomUUID(),
          stockItemId: body.stockItemId,
          quantity: body.quantity,
          value,
          reason: body.reason || "Non spécifié",
          date: new Date().toISOString().split("T")[0],
        });
        autoHideMenuFromStock(db);
        regenerateShoppingList(db);
        runAlertEngine(db);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
