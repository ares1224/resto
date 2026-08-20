import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiRole, apiError } from "@/lib/api-auth";
import { findUserByEmail, getPlatformDb, getRequestTenantId, updateDb } from "@/lib/db/store";
import { logAudit } from "@/lib/audit";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { sendEmployeeInviteEmail } from "@/lib/email";
import type { Role } from "@/types";

export async function GET() {
  try {
    await requireApiRole(["gerant"]);
    const db = await updateDb(() => {});
    return NextResponse.json(db.employees);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiRole(["gerant"]);
    const restaurantId = await getRequestTenantId();
    const body = await request.json();

    if (!body.firstName?.trim() || !body.lastName?.trim() || !body.role?.trim()) {
      return NextResponse.json({ error: "Prénom, nom et poste requis" }, { status: 400 });
    }

    const employeeId = crypto.randomUUID();
    const today = new Date().toISOString().split("T")[0];
    const email = body.email?.trim().toLowerCase() ?? "";

    if (email) {
      const platform = await getPlatformDb();
      if (findUserByEmail(platform, email)) {
        return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
      }
    }

    let userId: string | undefined;
    let tempPassword: string | undefined;
    let createdLogin = false;

    const db = await updateDb((db) => {
      db.employees.push({
        id: employeeId,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        role: body.role.trim(),
        contractType: body.contractType ?? "CDI",
        hourlyRate: body.hourlyRate ?? 0,
        weeklyMaxHours: body.weeklyMaxHours ?? 35,
        phone: body.phone ?? "",
        email,
        startDate: today,
        documents: [],
        trainings: [],
        hrNotes: body.hrNotes ?? "",
        active: true,
      });

      if (email) {
        userId = crypto.randomUUID();
        tempPassword = generateTempPassword(10);
        const role: Role = body.loginRole === "manager" ? "manager" : "employe";

        db.users.push({
          id: userId,
          email,
          password: hashPassword(tempPassword),
          name: `${body.firstName.trim()} ${body.lastName.trim()}`,
          role,
          restaurantId,
          employeeId,
          emailConfirmed: true,
          mustChangePassword: true,
        });
        createdLogin = true;

        db.notifications.unshift({
          id: crypto.randomUUID(),
          type: "general",
          title: "Bienvenue",
          message: "Votre compte a été créé. Consultez votre email pour vos identifiants, puis changez votre mot de passe à la première connexion.",
          severity: "info",
          read: false,
          createdAt: new Date().toISOString(),
          targetRoles: [role],
          targetUserId: userId,
        });
      }
    });

    let emailSent = false;
    if (createdLogin && email && tempPassword) {
      emailSent = await sendEmployeeInviteEmail({
        to: email,
        employeeFirstName: String(body.firstName).trim(),
        gerantName: session.name,
        restaurantName: db.settings.restaurantName || "votre restaurant",
        tempPassword,
      });
    }

    revalidatePath("/personnel/employes");
    revalidatePath("/personnel");

    await logAudit(
      session,
      "employee_create",
      `Employé ${body.firstName} ${body.lastName}${email ? " — compte créé" : ""}`
    );

    return NextResponse.json({
      ok: true,
      id: employeeId,
      userId,
      emailSent,
      message: email
        ? emailSent
          ? "Employé enregistré. Un email avec les identifiants a été envoyé."
          : "Employé enregistré. L'email n'a pas pu être envoyé, veuillez réessayer."
        : "Employé enregistré sans accès connexion (email non renseigné).",
    });
  } catch (e) {
    return apiError(e);
  }
}
