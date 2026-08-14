import { getDb } from "@/lib/db/store";
import { WastePageClient } from "@/components/stocks/WastePageClient";

export default async function GaspillagePage() {
  const db = await getDb();
  return <WastePageClient db={db} />;
}
