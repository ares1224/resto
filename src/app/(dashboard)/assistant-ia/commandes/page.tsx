import Link from "next/link";
import { requireGerant } from "@/lib/page-guard";
import { getDb, updateDb } from "@/lib/db/store";
import { regenerateShoppingList } from "@/lib/business";
import { AiPageHeader } from "@/components/ai/AiPageHeader";
import { SupplierOrderAssistPanel } from "@/components/ai/AiPanels";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AssistantIaCommandesPage() {
  await requireGerant();
  await updateDb((db) => regenerateShoppingList(db));
  const db = await getDb();
  const stockNames = Object.fromEntries(db.stockItems.map((s) => [s.id, s.name]));
  const pending = db.shoppingList.filter((i) => !i.ordered);

  return (
    <div className="space-y-6">
      <AiPageHeader
        title="Aide aux commandes fournisseurs"
        description="Croisez la fréquentation attendue avec votre liste de courses. Les quantités suggérées restent modifiables avant toute commande — rien n'est envoyé automatiquement."
      />
      <SupplierOrderAssistPanel />
      <Card title={`Liste de courses — ${pending.length} article(s) à commander`}>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">
            Rien à commander pour l&apos;instant — tous les stocks sont au-dessus des seuils.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((item) => (
              <li key={item.id} className="rounded-lg bg-stone-50 p-4">
                <p className="font-medium">
                  {item.customName ??
                    (item.stockItemId ? stockNames[item.stockItemId] : undefined) ??
                    "Article"}
                </p>
                <p className="text-sm text-stone-500">
                  Qté suggérée : {item.suggestedQty} · {item.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/stocks/commandes" className="quick-link inline-flex min-h-[36px] items-center rounded-xl px-4 text-sm">
            Préparer une commande fournisseur →
          </Link>
          <Link href="/stocks/courses" className="quick-link inline-flex min-h-[36px] items-center rounded-xl px-4 text-sm">
            Gérer la liste de courses
          </Link>
        </div>
      </Card>
      {pending.some((i) => i.reason.includes("péremption")) && (
        <p className="text-xs text-amber-800">
          <Badge variant="warning">Conseil</Badge>{" "}
          Certains articles ont une péremption proche — priorisez-les dans vos commandes.
        </p>
      )}
    </div>
  );
}
