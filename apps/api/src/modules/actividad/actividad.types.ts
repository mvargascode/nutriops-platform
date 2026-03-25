export type ActividadTotales = {
  total: number;
  desayuno: number;
  almuerzo: number;
  once: number;
};

export type ActividadPorHoraItem = {
  hora: number;
  cantidad: number;
};

export type ActividadComparacion = {
  delta: number;
  pct: number | null;
};

export type ActividadHoyResponse = {
  fecha: string;
  total: number;
  desayuno: number;
  almuerzo: number;
  once: number;
  porHora: ActividadPorHoraItem[];
  ayerHastaAhora: ActividadTotales;
  comparacion: ActividadComparacion;
  ayerTotalDia: number;
  ayerDia: ActividadTotales;
  serverTime: string;
};

export type ActividadHoyStreamPayload = ActividadHoyResponse & {
  ts: number;
};

export type ActividadStreamBuildResult = {
  payload: ActividadHoyStreamPayload;
  fp: string;
};
