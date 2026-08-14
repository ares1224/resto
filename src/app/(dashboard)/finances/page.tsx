import { redirect } from "next/navigation";
import { requirePagePermission } from "@/lib/page-guard";

export default async function FinancesPage() {
  await requirePagePermission("view_financial_dashboard");
  redirect("/finances/tresorerie");
}
