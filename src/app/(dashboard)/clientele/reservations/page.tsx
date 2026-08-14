import { getDb } from "@/lib/db/store";
import { ReservationsClient } from "@/components/clientele/ReservationsClient";

export default async function ReservationsPage() {
  const db = await getDb();
  const reservations = [...db.reservations].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  return <ReservationsClient reservations={reservations} />;
}
