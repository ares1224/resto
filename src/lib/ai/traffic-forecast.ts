import type { Database } from "@/types";
import type { TrafficForecastDay, TrafficForecastResult } from "@/types/ai";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function dayOfWeekFromDate(date: string): number {
  const d = new Date(date);
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function generateTrafficForecast(
  db: Database,
  startDate?: string,
  horizonDays = 7
): TrafficForecastResult {
  const today = new Date().toISOString().split("T")[0];
  const start = startDate ?? today;
  const historyDays = 28;

  const cutoff = addDays(today, -historyDays);
  const history = db.trafficStats.filter((s) => s.date >= cutoff);

  const byDowHour: Record<string, number[]> = {};
  for (const stat of history) {
    const dow = dayOfWeekFromDate(stat.date);
    const key = `${dow}-${stat.hour}`;
    if (!byDowHour[key]) byDowHour[key] = [];
    byDowHour[key].push(stat.covers);
  }

  const recentCutoff = addDays(today, -7);
  const recentByDowHour: Record<string, number[]> = {};
  for (const stat of history.filter((s) => s.date >= recentCutoff)) {
    const dow = dayOfWeekFromDate(stat.date);
    const key = `${dow}-${stat.hour}`;
    if (!recentByDowHour[key]) recentByDowHour[key] = [];
    recentByDowHour[key].push(stat.covers);
  }

  const hours = [...new Set(history.map((s) => s.hour))].sort((a, b) => a - b);
  if (hours.length === 0) {
    for (const peak of db.settings.peakSlots) {
      const h = parseInt(peak.start.split(":")[0], 10);
      if (!hours.includes(h)) hours.push(h);
    }
    hours.sort((a, b) => a - b);
  }

  const days: TrafficForecastDay[] = [];
  const peakInsights: string[] = [];

  for (let i = 0; i < horizonDays; i++) {
    const date = addDays(start, i);
    const dow = dayOfWeekFromDate(date);
    const reservationCovers = db.reservations
      .filter((r) => r.date === date && r.status === "confirmed")
      .reduce((s, r) => s + r.covers, 0);

    const slots = hours.map((hour) => {
      const key = `${dow}-${hour}`;
      const historical = byDowHour[key] ?? [];
      const recent = recentByDowHour[key] ?? [];
      const base = historical.length > 0 ? avg(historical) : avg(history.map((s) => s.covers));
      const trend = recent.length > 0 && historical.length > 0 ? avg(recent) / Math.max(avg(historical), 1) : 1;
      const trendAdj = Math.min(1.3, Math.max(0.7, trend));
      let expected = Math.round(base * trendAdj);

      const confidence: "low" | "medium" | "high" =
        historical.length >= 4 ? "high" : historical.length >= 2 ? "medium" : "low";

      const basis =
        historical.length > 0
          ? `Moyenne ${DAY_LABELS[dow % 7]} ${hour}h sur ${historical.length} point(s) historique(s), tendance ${(trendAdj * 100 - 100).toFixed(0)}%`
          : `Estimation par défaut (peu de données historiques)`;

      return { hour, expectedCovers: expected, confidence, basis };
    });

    const slotTotal = slots.reduce((s, sl) => s + sl.expectedCovers, 0);
    const reservationBoost = Math.round(reservationCovers * 0.4);
    const totalExpectedCovers = Math.min(
      (db.settings.covers > 0 ? db.settings.covers : 999) * slots.length,
      slotTotal + reservationBoost
    );

    days.push({
      date,
      dayOfWeek: dow,
      dayLabel: DAY_LABELS[dow % 7],
      slots,
      totalExpectedCovers,
      reservationCovers,
    });
  }

  const busiest = [...days].sort((a, b) => b.totalExpectedCovers - a.totalExpectedCovers)[0];
  if (busiest) {
    peakInsights.push(
      `Pic attendu : ${busiest.dayLabel} ${busiest.date} (~${busiest.totalExpectedCovers} couverts estimés${busiest.reservationCovers > 0 ? `, dont ${busiest.reservationCovers} déjà réservés` : ""})`
    );
  }

  const lowData = Object.values(byDowHour).filter((v) => v.length < 2).length;
  if (lowData > 0) {
    peakInsights.push(
      `${lowData} créneau(x) avec peu d'historique — prévisions indicatives, à ajuster manuellement.`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    historyDays,
    days,
    peakInsights,
  };
}

export function expectedCoversForPeak(
  db: Database,
  date: string,
  peakStart: string,
  peakEnd: string,
  forecast?: TrafficForecastResult
): number {
  const dayForecast = forecast?.days.find((d) => d.date === date);
  if (!dayForecast) return 0;
  const startH = parseInt(peakStart.split(":")[0], 10);
  const endH = parseInt(peakEnd.split(":")[0], 10);
  return dayForecast.slots
    .filter((s) => s.hour >= startH && s.hour <= endH)
    .reduce((sum, s) => sum + s.expectedCovers, 0);
}
