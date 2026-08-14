import { getDb } from "@/lib/db/store";
import { updateDb } from "@/lib/db/store";
import { autoHideMenuFromStock } from "@/lib/business";
import { MenuEditor } from "@/components/operations/MenuEditor";

export default async function MenuPage() {
  await updateDb((db) => autoHideMenuFromStock(db));
  const db = await getDb();
  return <MenuEditor items={db.menuItems} />;
}
