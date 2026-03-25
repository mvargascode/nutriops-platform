export type ReportTipo = "all" | 1 | 2 | 3;

export type ConsumoDiaRow = {
  fecha: string; // YYYY-MM-DD
  d1: number;
  d2: number;
  d3: number;
  total: number;
};

export type ReportKpis = {
  total: number;
  avg_diario: number;
  pico: { fecha: string; total: number } | null;
  por_tipo: { "1": number; "2": number; "3": number };
};

export type ConsumoReport = {
  from: string;
  to: string;
  tipo: ReportTipo;
  kpis: ReportKpis;
  series_diaria: ConsumoDiaRow[];
  compare?: {
    from: string;
    to: string;
    kpis: ReportKpis;
  };
  delta?: {
    total: { abs: number; pct: number | null };
    avg_diario: { abs: number; pct: number | null };
    por_tipo: {
      "1": { abs: number; pct: number | null };
      "2": { abs: number; pct: number | null };
      "3": { abs: number; pct: number | null };
    };
  };
};

export type BuildConsumoReportArgs = {
  from: string;
  to: string;
  tipo: ReportTipo;
};
