import { requireGerant } from "@/lib/page-guard";
import { AiPageHeader } from "@/components/ai/AiPageHeader";
import { GerantChatPanel } from "@/components/ai/GerantChatPanel";

export default async function AssistantIaChatPage() {
  await requireGerant();

  return (
    <div className="space-y-6">
      <AiPageHeader
        title="Agent conversationnel"
        description="Posez vos questions en langage naturel — l&apos;assistant répond à partir de vos données réelles (CA, stocks, planning, clientèle…). Il ne modifie jamais vos données automatiquement."
      />
      <GerantChatPanel />
    </div>
  );
}
