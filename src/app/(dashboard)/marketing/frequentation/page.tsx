import Link from "next/link";
import { getDb } from "@/lib/db/store";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function FrequentationPage() {
  const db = await getDb();

  if (db.trafficStats.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/marketing" className="text-sm text-amber-700 hover:underline">← Marketing</Link>
        <h1 className="text-2xl font-bold">Fréquentation</h1>
        <EmptyState
          title="Aucune donnée de fréquentation"
          description="Les statistiques apparaîtront ici au fur et à mesure que vous enregistrez la fréquentation ou des ventes."
          actionLabel="Voir l'assistant IA"
          actionHref="/assistant-ia"
        />
      </div>
    );
  }

  const byDayHour: Record<string, number> = {};
  for (const stat of db.trafficStats) {
    const key = `${stat.date} ${stat.hour}h`;
    byDayHour[key] = (byDayHour[key] ?? 0) + stat.covers;
  }

  const hourTotals: Record<number, number> = {};
  for (const stat of db.trafficStats) {
    hourTotals[stat.hour] = (hourTotals[stat.hour] ?? 0) + stat.covers;
  }

  const peakHour = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <Link href="/marketing" className="text-sm text-amber-700 hover:underline">← Marketing</Link>
      <h1 className="text-2xl font-bold">Fréquentation</h1>
      <Card title="Heure de pointe">
        <p className="text-2xl font-bold">{peakHour ? `${peakHour[0]}h — ${peakHour[1]} couverts` : "—"}</p>
      </Card>
      <Card title="Répartition par créneau">
        <div className="space-y-2">
          {Object.entries(hourTotals).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, covers]) => (
            <div key={hour} className="flex items-center gap-3">
              <span className="w-12 text-sm text-stone-500">{hour}h</span>
              <div className="h-6 flex-1 rounded bg-stone-100">
                <div className="h-full rounded bg-amber-500" style={{ width: `${Math.min(100, (covers / (peakHour?.[1] ?? 1)) * 100)}%` }} />
              </div>
              <span className="w-16 text-right text-sm">{covers}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
