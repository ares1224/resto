"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AnomalyAlert, TrafficForecastResult } from "@/types/ai";

const CATEGORY_LABELS: Record<AnomalyAlert["category"], string> = {
  stock: "Stock",
  margin: "Marge",
  expense: "Charge",
};

type ForecastVariant = "full" | "compact" | "planning";

export function TrafficForecastPanel({
  variant = "full",
  days = 7,
}: {
  variant?: ForecastVariant;
  days?: number;
}) {
  const [forecast, setForecast] = useState<TrafficForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ai/forecast?days=${days}`)
      .then((r) => r.json())
      .then(setForecast)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <Card title={variant === "planning" ? "Fréquentation estimée (planning)" : "Prévision de fréquentation"}>
        <p className="text-sm">Analyse en cours…</p>
      </Card>
    );
  }
  if (!forecast) return null;

  const visibleDays =
    variant === "compact" ? forecast.days.slice(0, 3) : variant === "planning" ? forecast.days.slice(0, 7) : forecast.days;

  if (variant === "compact") {
    const totalCovers = visibleDays.reduce((s, d) => s + d.totalExpectedCovers, 0);
    return (
      <Card title="Prévision de fréquentation (3 prochains jours)">
        <p className="mb-3 text-sm text-amber-900">
          {totalCovers} couverts estimés sur 3 jours — basé sur {forecast.historyDays} jours d&apos;historique et les réservations confirmées.
        </p>
        {forecast.peakInsights.slice(0, 2).map((insight, i) => (
          <p key={i} className="mb-2 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-900">
            {insight}
          </p>
        ))}
        <div className="space-y-2">
          {visibleDays.map((day) => (
            <div key={day.date} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <span className="font-medium">
                {day.dayLabel} {day.date}
              </span>
              <span>{day.totalExpectedCovers} couverts</span>
              {day.reservationCovers > 0 && (
                <span className="text-xs text-stone-500">({day.reservationCovers} réservés)</span>
              )}
            </div>
          ))}
        </div>
        <Link href="/assistant-ia/previsions" className="quick-link mt-3 inline-flex text-sm">
          Voir le détail créneaux → Prévisions
        </Link>
      </Card>
    );
  }

  if (variant === "planning") {
    return (
      <Card title="Fréquentation estimée — semaine à planifier">
        <p className="mb-3 text-sm text-amber-900">
          Utilisez ces estimations pour dimensionner les effectifs. Détail par créneau horaire ci-dessous.
        </p>
        {forecast.peakInsights.map((insight, i) => (
          <p key={i} className="mb-2 rounded-lg bg-blue-50 p-2 text-sm font-medium text-blue-950">
            {insight}
          </p>
        ))}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Date</th>
                <th className="pb-2">Couverts</th>
                <th className="pb-2">Créneaux forts</th>
              </tr>
            </thead>
            <tbody>
              {visibleDays.map((day) => {
                const topSlots = [...day.slots].sort((a, b) => b.expectedCovers - a.expectedCovers).slice(0, 2);
                return (
                  <tr key={day.date} className="border-b border-amber-50">
                    <td className="py-2 font-medium">
                      {day.dayLabel} {day.date}
                    </td>
                    <td className="py-2">{day.totalExpectedCovers}</td>
                    <td className="py-2 text-xs">
                      {topSlots.map((s) => (
                        <span key={s.hour} className="mr-2">
                          {s.hour}h: {s.expectedCovers}
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SlotDetailSection days={visibleDays.slice(0, 3)} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card title={`Prévision de fréquentation (${days} prochains jours)`}>
        <p className="mb-3 text-sm text-amber-900">
          Estimation indicative basée sur {forecast.historyDays} jours d&apos;historique, tendances récentes et
          réservations confirmées.
        </p>
        {forecast.peakInsights.map((insight, i) => (
          <p key={i} className="mb-2 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-900">
            {insight}
          </p>
        ))}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Date</th>
                <th className="pb-2">Couverts estimés</th>
                <th className="pb-2">Réservations</th>
                <th className="pb-2">Créneaux forts</th>
              </tr>
            </thead>
            <tbody>
              {forecast.days.map((day) => {
                const topSlots = [...day.slots].sort((a, b) => b.expectedCovers - a.expectedCovers).slice(0, 2);
                return (
                  <tr key={day.date} className="border-b border-amber-50">
                    <td className="py-2 font-medium">
                      {day.dayLabel} {day.date}
                    </td>
                    <td className="py-2">{day.totalExpectedCovers}</td>
                    <td className="py-2">{day.reservationCovers || "—"}</td>
                    <td className="py-2 text-xs">
                      {topSlots.map((s) => (
                        <span key={s.hour} className="mr-2">
                          {s.hour}h: {s.expectedCovers}
                          <Badge variant={s.confidence === "high" ? "success" : s.confidence === "medium" ? "warning" : "default"}>
                            {s.confidence}
                          </Badge>
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Détail par créneau horaire">
        <SlotDetailSection days={forecast.days.slice(0, 3)} />
      </Card>
    </div>
  );
}

function SlotDetailSection({ days }: { days: TrafficForecastResult["days"] }) {
  return (
    <>
      {days.map((day) => (
        <div key={day.date} className="mb-4">
          <p className="mb-2 font-bold text-amber-950">
            {day.dayLabel} {day.date}
          </p>
          <div className="space-y-1">
            {day.slots
              .filter((s) => s.expectedCovers > 0)
              .map((s) => (
                <div key={s.hour} className="flex items-center gap-2 text-xs">
                  <span className="w-8">{s.hour}h</span>
                  <div className="h-4 flex-1 rounded bg-stone-100">
                    <div
                      className="h-full rounded bg-amber-500"
                      style={{
                        width: `${Math.min(100, (s.expectedCovers / Math.max(day.totalExpectedCovers, 1)) * 100 * 3)}%`,
                      }}
                    />
                  </div>
                  <span className="w-8">{s.expectedCovers}</span>
                  <span className="flex-1 text-stone-600">{s.basis}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AnomalyPanel({
  initial,
  categories,
  title = "Anomalies détectées",
  limit,
  showViewAll,
}: {
  initial?: AnomalyAlert[];
  categories?: AnomalyAlert["category"][];
  title?: string;
  limit?: number;
  showViewAll?: string;
}) {
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    fetch("/api/ai/anomalies")
      .then((r) => r.json())
      .then((d) => setAnomalies(d.anomalies ?? []))
      .finally(() => setLoading(false));
  }, [initial]);

  const filtered = categories ? anomalies.filter((a) => categories.includes(a.category)) : anomalies;
  const displayed = limit ? filtered.slice(0, limit) : filtered;

  if (loading) {
    return (
      <Card title={title}>
        <p className="text-sm">Analyse en cours…</p>
      </Card>
    );
  }

  return (
    <Card title={title}>
      <p className="mb-3 text-sm text-amber-900">
        Chaque alerte explique clairement l&apos;écart constaté et le détail du calcul (ventes, stocks, marges ou charges).
      </p>
      {displayed.length === 0 ? (
        <p className="text-sm font-medium text-green-800">Aucune anomalie significative détectée.</p>
      ) : (
        <ul className="space-y-3">
          {displayed.map((a) => (
            <li key={a.id} className="rounded-xl border-2 border-amber-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={a.severity === "critical" ? "danger" : "warning"}>
                  {a.severity === "critical" ? "Urgent" : "À surveiller"}
                </Badge>
                <Badge variant="info">{CATEGORY_LABELS[a.category]}</Badge>
                <span className="font-bold text-amber-950">{a.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-amber-950">{a.explanation}</p>
              <dl className="mt-3 space-y-1 rounded-lg bg-stone-50 p-3">
                {a.details.map((line) => (
                  <div key={line.label} className="flex flex-wrap justify-between gap-x-4 text-sm">
                    <dt className="text-stone-600">{line.label}</dt>
                    <dd className={`font-medium ${line.highlight ? "text-amber-950" : "text-stone-800"}`}>
                      {line.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 font-mono text-xs text-stone-500">{a.calculation}</p>
              {a.actionHref && (
                <Link href={a.actionHref} className="mt-3 inline-flex text-sm text-amber-700 hover:underline">
                  En savoir plus dans Assistant IA →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {showViewAll && filtered.length > (limit ?? filtered.length) && (
        <Link href={showViewAll} className="quick-link mt-4 inline-flex text-sm">
          Voir toutes les alertes →
        </Link>
      )}
    </Card>
  );
}

export function SupplierOrderAssistPanel() {
  const [forecast, setForecast] = useState<TrafficForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/forecast?days=7")
      .then((r) => r.json())
      .then(setForecast)
      .finally(() => setLoading(false));
  }, []);

  const next3 = forecast?.days.slice(0, 3) ?? [];
  const totalCovers = next3.reduce((s, d) => s + d.totalExpectedCovers, 0);
  const avgDaily = next3.length > 0 ? totalCovers / next3.length : 0;
  const peakDay = next3.reduce(
    (best, d) => (d.totalExpectedCovers > (best?.totalExpectedCovers ?? 0) ? d : best),
    next3[0]
  );

  return (
    <Card title="Aide aux commandes fournisseurs">
      <p className="text-sm text-amber-900">
        Les quantités suggérées ci-dessous tiennent compte des seuils et péremptions. Ajustez-les selon la fréquentation
        attendue avant de passer commande — rien n&apos;est envoyé automatiquement.
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-stone-500">Calcul de la fréquentation…</p>
      ) : forecast && peakDay ? (
        <div className="mt-3 space-y-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
          <p>
            <strong>3 prochains jours :</strong> ~{totalCovers} couverts estimés (moy. {avgDaily.toFixed(0)}/jour).
          </p>
          <p>
            <strong>Jour le plus chargé :</strong> {peakDay.dayLabel} {peakDay.date} — {peakDay.totalExpectedCovers}{" "}
            couverts
            {peakDay.reservationCovers > 0 && ` (${peakDay.reservationCovers} déjà réservés)`}.
          </p>
          {forecast.peakInsights.slice(0, 1).map((insight, i) => (
            <p key={i} className="text-emerald-900">{insight}</p>
          ))}
          <p className="text-xs text-emerald-800">
            En cas de pic, augmentez les quantités suggérées avant validation. Comparez avec vos fournisseurs habituels.
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/stocks/fournisseurs" className="quick-link inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm">
          Gérer les fournisseurs
        </Link>
      </div>
    </Card>
  );
}

export function PlanningAiPanel({
  weekStart,
  employees,
}: {
  weekStart: string;
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [proposal, setProposal] = useState<{
    summary: string;
    warnings: string[];
    slots: {
      tempId: string;
      employeeId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      breakMinutes: number;
      isPeak: boolean;
      rationale: string;
    }[];
    staffNeeds: { dayOfWeek: number; peakLabel: string; required: number; assigned: number }[];
  } | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  async function generate() {
    setLoading(true);
    setOpen(true);
    const res = await fetch("/api/ai/planning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const data = await res.json();
    setProposal(data);
    setLoading(false);
  }

  async function apply() {
    if (!proposal) return;
    setApplying(true);
    await fetch("/api/ai/planning", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        mode: mode === "merge" ? "merge" : "replace",
        slots: proposal.slots.map((s) => ({
          employeeId: s.employeeId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes,
          isPeak: s.isPeak,
        })),
      }),
    });
    setApplying(false);
    window.location.reload();
  }

  return (
    <>
      <Button onClick={generate} disabled={loading} variant="secondary">
        {loading ? "Génération…" : "Générer le planning automatiquement"}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-amber-950">Proposition de planning — semaine du {weekStart}</h2>
            <p className="mt-2 text-sm text-amber-900">
              Proposition modifiable. Rien n&apos;est appliqué tant que vous ne validez pas. Vous pourrez ensuite éditer
              chaque créneau manuellement.
            </p>
            {loading ? (
              <p className="mt-4">Analyse des disponibilités, fréquentation et contraintes légales…</p>
            ) : proposal ? (
              <>
                <p className="mt-3 font-medium text-green-900">{proposal.summary}</p>
                {proposal.warnings.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-100 p-3 text-sm">
                    <strong>Points d&apos;attention :</strong>
                    <ul className="mt-1 list-disc pl-4">
                      {proposal.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2">Jour</th>
                        <th className="pb-2">Employé</th>
                        <th className="pb-2">Horaire</th>
                        <th className="pb-2">Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposal.slots.map((s) => {
                        const emp = employees.find((e) => e.id === s.employeeId);
                        return (
                          <tr key={s.tempId} className="border-b border-amber-50">
                            <td className="py-1">{DAYS[s.dayOfWeek - 1]}</td>
                            <td className="py-1">{emp ? `${emp.firstName} ${emp.lastName}` : "?"}</td>
                            <td className="py-1">
                              {s.startTime}-{s.endTime}
                              {s.isPeak && " ⚡"}
                            </td>
                            <td className="py-1 text-xs text-stone-600">{s.rationale}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
                    Remplacer la semaine
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} />
                    Fusionner avec l&apos;existant
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={apply} disabled={applying || proposal.slots.length === 0}>
                    {applying ? "Application…" : "Valider et appliquer"}
                  </Button>
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
