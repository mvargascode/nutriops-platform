export type ExecutiveSeverity = "info" | "warning" | "critical";

export type ExecutiveAlert = {
  code: string;
  severity: ExecutiveSeverity;
  title: string;
  message: string;
  metric?: string;
  threshold?: number;

  unit?: string;
  actual?: number;
  previous?: number;
  delta?: number;
  deltaPct?: number | null;

  actualLabel?: string;
  previousLabel?: string;

  period?: { from: string; to: string };
  prevPeriod?: { from: string; to: string };
};

export type ExecutiveWindow = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

export type ExecutiveTotal = {
  date?: string; // para "today" (YYYY-MM-DD)
  from?: string; // para week/month
  to?: string; // para week/month
  total: number;
  prevTotal?: number; // total del periodo anterior (si aplica)
  delta?: number; // total - prevTotal
  deltaPct?: number | null; // si prevTotal=0 => null
};

export type ExecutiveDistributionToday = {
  desayuno: number;
  almuerzo: number;
  cena: number;
};

export type ExecutiveTrendPoint = {
  date: string; // YYYY-MM-DD
  total: number;
};

export type ExecutiveSummaryResponse = {
  refDate: string; // YYYY-MM-DD (fecha base usada)
  today: ExecutiveTotal;
  week: ExecutiveTotal;
  month: ExecutiveTotal;
  distributionToday: ExecutiveDistributionToday;
  trend30d: ExecutiveTrendPoint[];
  alerts: ExecutiveAlert[];
};
