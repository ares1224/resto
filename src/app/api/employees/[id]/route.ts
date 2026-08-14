import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";
import { logAudit } from "@/lib/audit";
import { removeEmployeeFromDb } from "@/lib/employees";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireApiRole(["gerant"]);
    const { id } = await params;

    let removedName: string | null = null;
    await updateDb((db) => {
      removedName = removeEmployeeFromDb(db, id);
    });

    if (!removedName) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    revalidatePath("/personnel/employes");
    revalidatePath("/personnel");
    revalidatePath("/personnel/planning");

    await logAudit(session, "employee_delete", `Suppression employé ${removedName}`);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
