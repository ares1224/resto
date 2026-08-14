import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateDb } from "@/lib/db/store";
import { autoHideMenuFromStock } from "@/lib/business";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role === "employe") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = crypto.randomUUID();

  await updateDb((db) => {
    db.menuItems.push({
      id,
      name: body.name,
      category: body.category ?? "Plats",
      price: body.price ?? 0,
      description: body.description ?? "",
      available: true,
      isDailySpecial: false,
      allergens: [],
    });
    db.recipes.push({ id: crypto.randomUUID(), menuItemId: id, ingredients: [] });
    autoHideMenuFromStock(db);
  });

  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role === "employe") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  await updateDb((db) => {
    const item = db.menuItems.find((m) => m.id === body.id);
    if (item) {
      if (body.available !== undefined) item.available = body.available;
      if (body.isDailySpecial !== undefined) item.isDailySpecial = body.isDailySpecial;
    }
    autoHideMenuFromStock(db);
  });

  return NextResponse.json({ ok: true });
}
