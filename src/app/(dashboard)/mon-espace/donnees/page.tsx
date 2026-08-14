import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPersonalDataExport } from "@/lib/data-access";
import { Card } from "@/components/ui/Card";
import { GdprActions } from "@/components/mon-espace/GdprActions";

export default async function DonneesPage() {
  const session = await getSession();
  if (!session || session.role !== "employe") redirect("/dashboard");
  const db = await getDb();
  const data = getPersonalDataExport(db, session);
  if (!data) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-amber-700 hover:underline">← Mon espace</Link>
      <h1 className="text-2xl font-extrabold text-amber-950">Mes données personnelles</h1>
      <p className="font-medium text-amber-800">Consultation et suppression de vos données personnelles</p>
      <Card title="Identité">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-bold">Nom</dt><dd>{data.identity.firstName} {data.identity.lastName}</dd></div>
          <div><dt className="font-bold">Email</dt><dd>{data.identity.email}</dd></div>
          <div><dt className="font-bold">Téléphone</dt><dd>{data.identity.phone}</dd></div>
          <div><dt className="font-bold">Contrat</dt><dd>{data.contract.type} depuis {data.contract.startDate}</dd></div>
        </dl>
      </Card>
      <Card title="Documents & formations">
        <p className="text-sm"><strong>Documents :</strong> {data.documents.join(", ") || "Aucun"}</p>
        <ul className="mt-2 text-sm">
          {data.trainings.map((t, i) => (
            <li key={i}>{t.title} — {t.date}</li>
          ))}
        </ul>
      </Card>
      <GdprActions />
    </div>
  );
}
