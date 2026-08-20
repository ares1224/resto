"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, MessageSquarePlus, History } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { AiChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { toPublicError } from "@/lib/public-error";

type SessionSummary = { id: string; title: string; updatedAt: string; messageCount: number };

const THEME_SUGGESTIONS: { theme: string; color: string; questions: string[] }[] = [
  {
    theme: "Finances",
    color: "border-emerald-200 bg-emerald-50/80",
    questions: [
      "Quel est mon plat le plus rentable ce mois-ci ?",
      "Quel est mon chiffre d'affaires cette semaine ?",
      "Pourquoi ma marge a-t-elle baissé ce mois-ci ?",
    ],
  },
  {
    theme: "Personnel",
    color: "border-blue-200 bg-blue-50/80",
    questions: [
      "Qui travaille ce week-end ?",
      "Combien d'heures planifiées cette semaine pour mon équipe ?",
    ],
  },
  {
    theme: "Stocks",
    color: "border-orange-200 bg-orange-50/80",
    questions: [
      "Quels produits sont bientôt en rupture ?",
      "Quel est mon stock actuel de farine ?",
    ],
  },
  {
    theme: "Clientèle",
    color: "border-violet-200 bg-violet-50/80",
    questions: [
      "Combien de réservations confirmées à venir ?",
      "Combien de couverts sont réservés cette semaine ?",
    ],
  },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function GerantChatPanel() {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function applyState(data: {
    messages?: AiChatMessage[];
    sessions?: SessionSummary[];
    activeSessionId?: string;
  }) {
    setMessages(data.messages ?? []);
    setSessions(data.sessions ?? []);
    setActiveSessionId(data.activeSessionId ?? "");
  }

  useEffect(() => {
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then(applyState)
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    const optimistic: AiChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessages((m) => [
        ...m.filter((msg) => msg.id !== optimistic.id),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: toPublicError(data.error, "Erreur lors de l'analyse."),
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    applyState(data);
  }

  async function newConversation() {
    setLoading(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new_session" }),
    });
    const data = await res.json();
    setLoading(false);
    applyState(data);
    setShowHistory(false);
  }

  async function loadSession(sessionId: string) {
    setLoading(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "switch_session", sessionId }),
    });
    const data = await res.json();
    setLoading(false);
    applyState(data);
    setShowHistory(false);
  }

  const showWelcome = !initialLoading && messages.length === 0;

  return (
    <Card title="Assistant conversationnel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-amber-900">
          Analysez vos données en posant des questions en langage naturel. Les réponses s&apos;appuient sur vos
          enregistrements réels (personnel, stocks, finances, clientèle…). Aucune action n&apos;est exécutée
          automatiquement.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowHistory((v) => !v)}>
            <History className="h-4 w-4" />
            Historique
          </Button>
          <Button type="button" size="sm" onClick={newConversation} disabled={loading}>
            <MessageSquarePlus className="h-4 w-4" />
            Nouvelle conversation
          </Button>
        </div>
      </div>

      {showHistory && sessions.length > 0 && (
        <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border border-amber-200 bg-white p-2">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-amber-800">Conversations précédentes</p>
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSession(s.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100",
                s.id === activeSessionId && "bg-slate-100 font-semibold"
              )}
            >
              <span className="truncate">{s.title}</span>
              <span className="ml-2 shrink-0 text-xs text-stone-500">{s.messageCount} msg.</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex max-h-[520px] min-h-[360px] flex-col overflow-hidden rounded-xl border border-amber-200 bg-stone-50">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {initialLoading ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : showWelcome ? (
            <div className="space-y-5">
              <div className="flex gap-3 rounded-2xl bg-[#EEF2FF] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B3AE8] text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1A1D23]">Bonjour, je suis votre assistant.</p>
                  <p className="mt-1 text-[13px] text-[#374151]">
                    Je peux analyser vos chiffres et répondre à vos questions sur le personnel, les stocks, les
                    finances, la clientèle, le planning et plus encore. Cliquez sur un exemple ci-dessous ou
                    saisissez votre propre question.
                  </p>
                </div>
              </div>

              {THEME_SUGGESTIONS.map((group) => (
                <div key={group.theme}>
                  <p className="section-label mb-2">{group.theme}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.questions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => send(q)}
                        className="rounded-[20px] bg-[#EEF2FF] px-3 py-2 text-left text-[13px] font-medium text-[#1B3AE8] transition-colors hover:bg-[#E0E7FF]"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#1B3AE8]">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={cn("max-w-[85%]", msg.role === "user" ? "text-right" : "text-left")}>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-[#6B7280]">
                    {msg.role === "user" ? "Vous" : "Assistant"}
                  </p>
                  <div
                    className={cn(
                      "whitespace-pre-wrap px-4 py-2.5 text-[14px]",
                      msg.role === "user"
                        ? "rounded-2xl rounded-br-md bg-[#1B3AE8] text-white"
                        : "rounded-2xl rounded-bl-md bg-white text-[#1A1D23] shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    )}
                  >
                    {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                  </div>
                  <p className="mt-1 text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</p>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B3AE8] text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Bot className="h-4 w-4 animate-pulse" />
              Analyse de vos données…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {!showWelcome && messages.length > 0 && (
          <div className="shrink-0 border-t border-[#ECEEF3] bg-white px-4 py-2">
            <p className="section-label mb-1.5">Exemples rapides</p>
            <div className="flex flex-wrap gap-2">
              {THEME_SUGGESTIONS.flatMap((g) => g.questions.slice(0, 1)).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={loading}
                  className="rounded-[20px] bg-[#EEF2FF] px-3 py-1.5 text-[12px] font-medium text-[#1B3AE8] hover:bg-[#E0E7FF] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="flex shrink-0 gap-2 border-t border-[#ECEEF3] bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question sur l'établissement…"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[#ECEEF3] bg-[#F5F6FA] px-3 py-2 text-[14px] outline-none focus:border-[#1B3AE8]"
            disabled={loading}
          />
          <Button type="submit" size="lg" disabled={loading || !input.trim()} aria-label="Envoyer">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
