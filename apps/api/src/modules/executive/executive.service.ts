import {
  getMonthTotal,
  getPreviousMonthTotal,
  getPreviousWeekTotal,
  getTodayDistribution,
  getTodayTotal,
  getTrend30d,
  getWeekTotal,
} from "./executive.repository";
import { buildExecutiveAlerts } from "./executive.alerts";
import type { ExecutiveSummary } from "./executive.types";

function normalizeDate(date?: string): string | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

function pct(delta: number, prev: number): number | null {
  if (!prev || prev <= 0) return null;
  return (delta / prev) * 100;
}

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function firstDayOfMonthISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(1);
  return toISODate(d);
}

function lastDayOfPrevMonthISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(1);
  d.setDate(0);
  return toISODate(d);
}

function firstDayOfPrevMonthISO(dateISO: string): string {
  const lastPrev = lastDayOfPrevMonthISO(dateISO);
  return firstDayOfMonthISO(lastPrev);
}

export async function getExecutiveSummary(
  date?: string,
): Promise<ExecutiveSummary> {
  const ref = normalizeDate(date);

  const refSql = ref ? "DATE(?)" : "CURDATE()";
  const paramsRef = ref ? [ref] : [];

  const refDateISO = ref ?? toISODate(new Date());
  const refDate = new Date(`${refDateISO}T00:00:00`);

  const totalToday = await getTodayTotal(refSql, paramsRef);
  const distributionToday = await getTodayDistribution(refSql, paramsRef);

  const weekTotal = await getWeekTotal(refSql, paramsRef);
  const weekPrevTotal = await getPreviousWeekTotal(refSql, paramsRef);

  const weekDelta = weekTotal - weekPrevTotal;
  const weekDeltaPct = pct(weekDelta, weekPrevTotal);

  const day = refDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekFrom = toISODate(monday);
  const weekTo = toISODate(sunday);

  const monthTotal = await getMonthTotal(refSql, paramsRef);
  const monthPrevTotal = await getPreviousMonthTotal(refSql, paramsRef);

  const monthDelta = monthTotal - monthPrevTotal;
  const monthDeltaPct = pct(monthDelta, monthPrevTotal);

  const monthFrom = firstDayOfMonthISO(refDateISO);
  const monthTo = refDateISO;

  const startTrend = addDaysISO(refDateISO, -29);
  const trendRows = await getTrend30d(startTrend, refDateISO);

  const trendMap = new Map<string, number>();
  for (const row of trendRows) {
    trendMap.set(String(row.fecha), Number(row.total ?? 0));
  }

  const trend30d: Array<{ date: string; total: number }> = [];
  for (let i = 0; i < 30; i++) {
    const date = addDaysISO(startTrend, i);
    trend30d.push({ date, total: trendMap.get(date) ?? 0 });
  }

  const alerts = buildExecutiveAlerts({
    week: {
      total: weekTotal,
      prevTotal: weekPrevTotal,
      delta: weekDelta,
      deltaPct: weekDeltaPct,
    },
    month: {
      total: monthTotal,
      prevTotal: monthPrevTotal,
      delta: monthDelta,
      deltaPct: monthDeltaPct,
    },
  });

  return {
    refDate: refDateISO,
    today: {
      date: refDateISO,
      total: totalToday,
    },
    week: {
      from: weekFrom,
      to: weekTo,
      total: weekTotal,
      prevTotal: weekPrevTotal,
      delta: weekDelta,
      deltaPct: weekDeltaPct,
    },
    month: {
      from: monthFrom,
      to: monthTo,
      total: monthTotal,
      prevTotal: monthPrevTotal,
      delta: monthDelta,
      deltaPct: monthDeltaPct,
    },
    distributionToday,
    trend30d,
    alerts,
  };
}
