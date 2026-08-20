import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/db/store";
import { isSetupComplete } from "@/lib/db/seed";
import { attachSessionCookie, sessionFromUser, writeSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { SetupDraft, User } from "@/types";

const EMPTY_DRAFT: SetupDraft = {
  step: 1,
  restaurantName: "",
  address: "",
  cuisineType: "",
  covers: "",
  name: "",
  email: "",
  password: "",
  timezone: "Europe/Paris",
  currency: "EUR",
  locale: "fr",
};

function sanitizeDraft(raw: unknown): SetupDraft {
  const d = (raw ?? {}) as Partial<SetupDraft>;
  const step = Number(d.step);
  return {
    ...EMPTY_DRAFT,
    ...d,
    step: step >= 1 && step <= 4 ? step : 1,
    restaurantName: String(d.restaurantName ?? "").slice(0, 120),
    address: String(d.address ?? "").slice(0, 200),
    cuisineType: String(d.cuisineType ?? "").slice(0, 80),
    covers: String(d.covers ?? "").slice(0, 8),
    name: String(d.name ?? "").slice(0, 80),
    email: String(d.email ?? "").slice(0, 120),
    password: String(d.password ?? "").slice(0, 120),
    timezone: String(d.timezone ?? "Europe/Paris") || "Europe/Paris",
    currency: String(d.currency ?? "EUR") || "EUR",
    locale: String(d.locale ?? "fr") || "fr",
  };
}

export async function GET() {
  const db = await getDb();
  const complete = isSetupComplete(db);
  return NextResponse.json({
    needsSetup: !complete,
    draft: complete ? null : (db.settings.setupDraft ?? EMPTY_DRAFT),
  });
}

export async function POST(request: Request) {
  const db = await getDb();
  if (isSetupComplete(db)) {
    return NextResponse.json({ error: "Configuration déjà effectuée" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if (body.action === "save_draft") {
    const draft = sanitizeDraft(body.draft);
    await updateDb((inner) => {
      inner.settings.setupDraft = draft;
    });
    return NextResponse.json({ ok: true });
  }

  const draft = sanitizeDraft(body);
  const email = draft.email.trim().toLowerCase();
  const password = draft.password;
  const name = draft.name.trim();
  const restaurantName = draft.restaurantName.trim() || "Mon restaurant";

  if (!email || !password || !name || !draft.restaurantName.trim()) {
    return NextResponse.json(
      { error: "Nom de l'établissement, nom, email et mot de passe sont requis" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
  }

  const userId = crypto.randomUUID();
  const employeeId = crypto.randomUUID();
  const covers = Math.max(0, Number.parseInt(draft.covers, 10) || 0);

  const user: User = {
    id: userId,
    email,
    password,
    name,
    role: "gerant",
    employeeId,
  };

  await updateDb((inner) => {
    inner.settings.restaurantName = restaurantName;
    inner.settings.covers = covers;
    inner.settings.address = draft.address.trim();
    inner.settings.cuisineType = draft.cuisineType.trim();
    inner.settings.timezone = draft.timezone;
    inner.settings.currency = draft.currency;
    inner.settings.locale = draft.locale;
    inner.settings.setupComplete = true;
    inner.settings.setupDraft = null;
    inner.users.push(user);
    inner.employees.push({
      id: employeeId,
      firstName: name.split(" ")[0] ?? name,
      lastName: name.split(" ").slice(1).join(" ") || "—",
      role: "Gérant",
      contractType: "CDI",
      hourlyRate: 0,
      weeklyMaxHours: 45,
      phone: "",
      email,
      startDate: new Date().toISOString().split("T")[0],
      documents: [],
      trainings: [],
      hrNotes: "",
      active: true,
    });
  });

  const session = sessionFromUser(user);
  try {
    await writeSessionCookie(session);
  } catch {
    // Le cookie sera aussi posé sur la réponse HTTP ci-dessous.
  }

  try {
    await logAudit(session, "setup_complete", "Première configuration établissement");
  } catch {
    // La configuration est déjà persistée : un échec d'audit ne doit pas bloquer l'entrée.
  }

  const res = NextResponse.json({
    ok: true,
    restaurantName,
    redirectTo: "/dashboard",
  });
  revalidatePath("/dashboard");
  revalidatePath("/");
  return attachSessionCookie(res, session);
}
