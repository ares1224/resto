import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/store";
import { isSetupComplete } from "@/lib/db/seed";

export default async function Home() {
  const db = await getDb();
  if (!isSetupComplete(db)) redirect("/setup");
  redirect("/dashboard");
}
