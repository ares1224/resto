import { getDb } from "@/lib/db/store";
import { requirePagePermission } from "@/lib/page-guard";
import { PriceSimulator } from "@/components/finances/PriceSimulator";
import { computeFoodCost } from "@/lib/business";

export default async function SimulateurPage() {
  await requirePagePermission("view_treasury");
  const db = await getDb();
  const costs = Object.fromEntries(db.menuItems.map((m) => [m.id, computeFoodCost(db, m.id)]));

  return <PriceSimulator items={db.menuItems} costs={costs} />;
}
