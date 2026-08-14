import { NextResponse } from "next/server";
import { requireApiPermission, apiError } from "@/lib/api-auth";
import { getDb, updateDb } from "@/lib/db/store";
import {
  applyDeliveryNote,
  parseDeliveryNoteText,
  type ApplyDeliveryLineInput,
} from "@/lib/ai/delivery-note-parser";
import { autoHideMenuFromStock, regenerateShoppingList, runAlertEngine } from "@/lib/business";

export async function POST(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();
    const db = await getDb();
    const rawText = (body.rawText ?? body.text ?? "").trim();

    if (!rawText) {
      return NextResponse.json({ error: "Aucun texte à analyser" }, { status: 400 });
    }

    const result = parseDeliveryNoteText(db, rawText);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    await requireApiPermission("edit_stocks");
    const body = await request.json();
    const lines = body.lines as ApplyDeliveryLineInput[];
    const newFieldDefinitions = body.newFieldDefinitions ?? [];
    const defaultSupplierId = body.defaultSupplierId as string | undefined;

    if (!lines?.length) {
      return NextResponse.json({ error: "Aucune ligne à appliquer" }, { status: 400 });
    }

    let summary = { updated: 0, created: 0, skipped: 0 };
    await updateDb((db) => {
      summary = applyDeliveryNote(db, {
        lines,
        newFieldDefinitions,
        defaultSupplierId,
        addToExistingQuantity: body.addToExistingQuantity !== false,
      });
      autoHideMenuFromStock(db);
      regenerateShoppingList(db);
      runAlertEngine(db);
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return apiError(e);
  }
}
