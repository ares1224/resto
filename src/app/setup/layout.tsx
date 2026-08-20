import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/store";
import { isSetupComplete } from "@/lib/db/seed";
import { getSession } from "@/lib/auth";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const db = await getDb();
  if (isSetupComplete(db)) {
    const session = await getSession();
    redirect(session ? "/dashboard" : "/login");
  }
  return children;
}
