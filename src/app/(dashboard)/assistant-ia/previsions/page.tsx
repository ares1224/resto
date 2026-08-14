import { requireGerant } from "@/lib/page-guard";
import { AiPageHeader } from "@/components/ai/AiPageHeader";
import { TrafficForecastPanel } from "@/components/ai/AiPanels";

export default async function AssistantIaPrevisionsPage() {
  await requireGerant();

  return (
    <div className="space-y-6">
      <AiPageHeader
        title="Prévision de fréquentation"
        description="Estimation indicative sur 7 jours, basée sur l'historique, les tendances récentes et les réservations confirmées. Détail par créneau horaire inclus."
      />
      <TrafficForecastPanel variant="full" days={7} />
    </div>
  );
}
