import { fetchPorTipoByRange, fetchSeriesByRange } from "./reports.repository";
import type {
  BuildConsumoReportArgs,
  ConsumoDiaRow,
  ConsumoReport,
  ReportKpis,
} from "./reports.types";

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function diffDaysInclusive(from: string, to: string) {
  const a = parseYmd(from);
  const b = parseYmd(to);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

function pct(abs: number, base: number) {
  if (base === 0) return null;
  return Math.round((abs / base) * 100);
}

function buildKpis(
  series: ConsumoDiaRow[],
  por_tipo: { "1": number; "2": number; "3": number },
): ReportKpis {
  const total = series.reduce((acc, x) => acc + (x.total ?? 0), 0);
  const days = series.length || 0;
  const avg_diario = days ? Math.round(total / days) : 0;

  let pico: { fecha: string; total: number } | null = null;
  for (const r of series) {
    if (!pico || r.total > pico.total) {
      pico = { fecha: r.fecha, total: r.total };
    }
  }

  return { total, avg_diario, pico, por_tipo };
}

export async function buildConsumoReport(
  args: BuildConsumoReportArgs,
): Promise<ConsumoReport> {
  const { from, to, tipo } = args;

  const series_diaria = await fetchSeriesByRange(from, to, tipo);
  const por_tipo = await fetchPorTipoByRange(from, to, tipo);
  const kpis = buildKpis(series_diaria, por_tipo);

  const nDays = diffDaysInclusive(from, to);
  const prevTo = toYmd(addDays(parseYmd(from), -1));
  const prevFrom = toYmd(addDays(parseYmd(prevTo), -(nDays - 1)));

  const prevSeries = await fetchSeriesByRange(prevFrom, prevTo, tipo);
  const prevPorTipo = await fetchPorTipoByRange(prevFrom, prevTo, tipo);
  const prevKpis = buildKpis(prevSeries, prevPorTipo);

  const totalAbs = kpis.total - prevKpis.total;
  const avgAbs = kpis.avg_diario - prevKpis.avg_diario;

  const delta = {
    total: { abs: totalAbs, pct: pct(totalAbs, prevKpis.total) },
    avg_diario: { abs: avgAbs, pct: pct(avgAbs, prevKpis.avg_diario) },
    por_tipo: {
      "1": {
        abs: por_tipo["1"] - prevPorTipo["1"],
        pct: pct(por_tipo["1"] - prevPorTipo["1"], prevPorTipo["1"]),
      },
      "2": {
        abs: por_tipo["2"] - prevPorTipo["2"],
        pct: pct(por_tipo["2"] - prevPorTipo["2"], prevPorTipo["2"]),
      },
      "3": {
        abs: por_tipo["3"] - prevPorTipo["3"],
        pct: pct(por_tipo["3"] - prevPorTipo["3"], prevPorTipo["3"]),
      },
    },
  } as const;

  return {
    from,
    to,
    tipo,
    kpis,
    series_diaria,
    compare: {
      from: prevFrom,
      to: prevTo,
      kpis: prevKpis,
    },
    delta,
  };
}
