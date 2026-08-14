import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { requireGerant } from "@/lib/page-guard";
import { ManagerPermissionsForm } from "@/components/parametres/ManagerPermissionsForm";

export default async function DroitsPage() {
  await requireGerant();
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/parametres/audit" className="text-sm text-amber-700 hover:underline">← Paramètres</Link>
      <h1 className="text-2xl font-extrabold text-amber-950">Paramétrage des droits manager</h1>
      <ManagerPermissionsForm initial={db.settings.managerPermissions} />
    </div>
  );
}
