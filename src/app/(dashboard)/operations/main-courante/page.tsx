import { getDb } from "@/lib/db/store";
import { ShiftLogClient } from "@/components/operations/ShiftLogClient";

export default async function MainCourantePage() {
  const db = await getDb();
  const authors = Object.fromEntries(db.employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`]));
  const logs = [...db.shiftLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <ShiftLogClient logs={logs} authors={authors} />;
}
