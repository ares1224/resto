import { NextResponse } from "next/server";

/** L’ancien assistant de premier lancement est remplacé par /inscription. */
export async function GET() {
  return NextResponse.json({ needsSetup: false, draft: null });
}

export async function POST() {
  return NextResponse.json(
    { error: "Utilisez la page d’inscription publique", redirectTo: "/inscription" },
    { status: 410 }
  );
}
