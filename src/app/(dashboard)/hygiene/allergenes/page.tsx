import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { getMenuAllergens } from "@/lib/business";
import { Card } from "@/components/ui/Card";

export default async function AllergenesPage() {
  const db = await getDb();

  return (
    <div className="space-y-6">
      <Link href="/hygiene" className="text-sm text-amber-700 hover:underline">← Hygiène</Link>
      <h1 className="text-2xl font-bold">Allergènes par plat</h1>
      <p className="text-stone-500">Généré automatiquement depuis les fiches recettes</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {db.menuItems.map((item) => {
          const allergens = getMenuAllergens(db, item.id);
          return (
            <Card key={item.id}>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-stone-500">{item.category}</p>
              <p className="mt-2 text-sm">
                {allergens.length ? allergens.join(", ") : "Aucun allergène déclaré"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
