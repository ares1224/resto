import Link from "next/link";
import { requireGerant } from "@/lib/page-guard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function FinancesExportPage() {
  await requireGerant();

  return (
    <div className="space-y-6">
      <Link href="/finances/tresorerie" className="text-sm text-amber-700 hover:underline">
        ← Finances
      </Link>
      <h1 className="text-2xl font-bold text-amber-950">Export comptable</h1>
      <p className="text-sm text-amber-900">
        Téléchargez vos données financières au format CSV pour votre comptable ou votre logiciel de gestion.
      </p>

      <Card title="Exports disponibles">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="/api/export?type=accounting&format=csv">
            <Button size="lg">Export comptable (CSV)</Button>
          </a>
          <a href="/api/export?type=cashflow&format=csv">
            <Button size="lg" variant="secondary">
              Trésorerie (CSV)
            </Button>
          </a>
        </div>
      </Card>
    </div>
  );
}
