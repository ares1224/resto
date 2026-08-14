import { requireGerant } from "@/lib/page-guard";
import { getDb } from "@/lib/db/store";
import { detectAnomalies } from "@/lib/ai/anomaly-detector";
import { AiPageHeader } from "@/components/ai/AiPageHeader";
import { AnomalyPanel } from "@/components/ai/AiPanels";

export default async function AssistantIaAnomaliesPage() {
  await requireGerant();
  const db = await getDb();
  const anomalies = detectAnomalies(db);

  return (
    <div className="space-y-6">
      <AiPageHeader
        title="Anomalies détectées"
        description="Écarts calculés à partir des ventes, stocks, marges et charges. Chaque alerte explique clairement de quoi il s'agit, avec le détail du calcul."
      />
      <AnomalyPanel initial={anomalies} title="Analyse des anomalies" />
    </div>
  );
}
