import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { updateDb } from "@/lib/db/store";
import { logAudit } from "@/lib/audit";

export async function PUT(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const { managerPermissions, sessionTimeoutMinutes } = await request.json();

    await updateDb((db) => {
      if (managerPermissions) {
        db.settings.managerPermissions = { ...db.settings.managerPermissions, ...managerPermissions };
      }
      if (sessionTimeoutMinutes) {
        db.settings.sessionTimeoutMinutes = sessionTimeoutMinutes;
      }
    });

    await logAudit(session, "permissions_update", "Modification droits manager");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
