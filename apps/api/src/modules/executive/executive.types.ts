export type Severity = "info" | "warning" | "critical";

export type ExecutiveAlert = {
  code: string;
  severity: Severity;
  title: string;
  message: string;
  metric?: string;
  threshold?: number;

  actual?: number;
  previous?: number;
  delta?: number;
  deltaPct?: number;

  actualLabel?: string; // "Semana actual"
  previousLabel?: string; // "Semana anterior"
  unit?: string; // "consumos"
  period?: { from: string; to: string }; // periodo actual
  prevPeriod?: { from: string; to: string }; // periodo anterior
};

export type ExecutiveSummary = {
  refDate: string;

  today: {
    date: string;
    total: number;
  };

  week: {
    from: string;
    to: string;
    total: number;
    prevTotal: number;
    delta: number;
    deltaPct: number | null;
  };

  month: {
    from: string;
    to: string;
    total: number;
    prevTotal: number;
    delta: number;
    deltaPct: number | null;
  };

  distributionToday: {
    desayuno: number;
    almuerzo: number;
    cena: number;
  };

  trend30d: Array<{ date: string; total: number }>;

  alerts: ExecutiveAlert[];
};
