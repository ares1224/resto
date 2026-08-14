import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReplacementEmployee } from "@/components/personnel/ReplacementManager";
import { getReplacementOffersForSession } from "@/lib/data-access";

export default async function RemplacementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const db = await getDb();

  if (session.role === "employe") {
    const offers = getReplacementOffersForSession(db, session);
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="text-sm text-amber-700 hover:underline">← Mon espace</Link>
        <h1 className="text-2xl font-bold text-amber-950">Mes propositions de remplacement</h1>
        <ReplacementEmployee offers={offers} />
      </div>
    );
  }

  redirect("/personnel/planning");
}
