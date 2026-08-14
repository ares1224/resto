import { getDb } from "@/lib/db/store";
import { updateDb } from "@/lib/db/store";
import { regenerateShoppingList } from "@/lib/business";
import { ShoppingListClient } from "@/components/stocks/ShoppingListClient";

export default async function CoursesPage() {
  await updateDb((db) => regenerateShoppingList(db));
  const db = await getDb();
  const stockItems = db.stockItems.map((s) => ({
    id: s.id,
    name: s.name,
    supplierId: s.supplierId,
    unit: s.unit,
  }));
  const suppliers = db.suppliers.map((s) => ({ id: s.id, name: s.name }));

  return (
    <ShoppingListClient
      items={db.shoppingList}
      stockItems={stockItems}
      suppliers={suppliers}
    />
  );
}
