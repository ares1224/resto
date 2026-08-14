import type { ShiftSlot } from "./index";

export type ForecastSlot = {
  hour: number;
  expectedCovers: number;
  confidence: "low" | "medium" | "high";
  basis: string;
};

export type TrafficForecastDay = {
  date: string;
  dayOfWeek: number;
  dayLabel: string;
  slots: ForecastSlot[];
  totalExpectedCovers: number;
  reservationCovers: number;
};

export type TrafficForecastResult = {
  generatedAt: string;
  historyDays: number;
  days: TrafficForecastDay[];
  peakInsights: string[];
};

export type PlanningProposalSlot = Omit<ShiftSlot, "id"> & {
  tempId: string;
  rationale: string;
};

export type PlanningProposal = {
  weekStart: string;
  slots: PlanningProposalSlot[];
  warnings: string[];
  summary: string;
  staffNeeds: { dayOfWeek: number; peakLabel: string; required: number; assigned: number }[];
};

export type AnomalyDetailLine = {
  label: string;
  value: string;
  highlight?: boolean;
};

export type AnomalyAlert = {
  id: string;
  category: "stock" | "margin" | "expense";
  severity: "warning" | "critical";
  title: string;
  explanation: string;
  calculation: string;
  details: AnomalyDetailLine[];
  actionHref?: string;
};
