import type { ExecutiveAlert } from "./executive.types";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function buildExecutiveAlerts(input: {
  week: {
    total: number;
    prevTotal: number;
    delta: number;
    deltaPct: number | null;
  };
  month: {
    total: number;
    prevTotal: number;
    delta: number;
    deltaPct: number | null;
  };
}) {
  const alerts: ExecutiveAlert[] = [];

  const WEEK_DROP_THRESHOLD = -25;
  const MONTH_DROP_THRESHOLD = -15;

  if (
    input.week.prevTotal > 0 &&
    input.week.deltaPct !== null &&
    input.week.deltaPct <= WEEK_DROP_THRESHOLD
  ) {
    alerts.push({
      code: "WEEK_DROP",
      severity: "warning",
      title: "Caída inusual semanal",
      message: `Consumo semanal ${round1(input.week.deltaPct)}% vs semana anterior.`,
      metric: "week.deltaPct",
      threshold: WEEK_DROP_THRESHOLD,
      actual: input.week.total,
      previous: input.week.prevTotal,
      delta: input.week.delta,
      deltaPct: input.week.deltaPct,
    });
  }

  if (
    input.month.prevTotal > 0 &&
    input.month.deltaPct !== null &&
    input.month.deltaPct <= MONTH_DROP_THRESHOLD
  ) {
    alerts.push({
      code: "MONTH_DROP",
      severity: "warning",
      title: "Caída inusual mensual",
      message: `Consumo mensual ${round1(input.month.deltaPct)}% vs mes anterior.`,
      metric: "month.deltaPct",
      threshold: MONTH_DROP_THRESHOLD,
      actual: input.month.total,
      previous: input.month.prevTotal,
      delta: input.month.delta,
      deltaPct: input.month.deltaPct,
    });
  }

  return alerts;
}
