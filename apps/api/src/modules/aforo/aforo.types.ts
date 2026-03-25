export type AforoActualResponse = {
  aforo_total: number;
};

export type AforoHoyDetalleItem = {
  tipo: 1 | 2 | 3;
  cantidad: number;
};

export type AforoHoyPorTipoResponse = {
  fecha: string;
  tipo: number;
  cantidad: number;
};

export type AforoHoyResumenResponse = {
  fecha: string;
  detalle: AforoHoyDetalleItem[];
  total: number;
};

export type OcupacionParams = {
  tipo: number;
  ventanaMin: number;
  turno: number | null;
};

export type OcupacionData = {
  ocupacion: number;
  capacidad: number;
};

export type OcupacionResponse = {
  tipo: number;
  turno: number | null;
  ventanaMin: number;
  ocupacion: number;
  capacidad: number;
  porcentaje: number;
  serverTime: string;
};

export type OcupacionStreamPayload = OcupacionResponse & {
  ts: number;
};

export type OcupacionStreamBuildResult = {
  payload: OcupacionStreamPayload;
  fp: string;
};

export type DebugOcupacionRow = {
  db: string;
  g_tz: string;
  s_tz: string;
  now_db: string;
  c: number;
};

export type UltimaSemanaRow = {
  fecha: string;
  tipo: number;
  c: number;
};

export type UltimaSemanaDia = {
  fecha: string;
  desayuno: number;
  almuerzo: number;
  once: number;
  total: number;
};

export type UltimaSemanaTotales = {
  desayuno: number;
  almuerzo: number;
  once: number;
  total: number;
};

export type UltimaSemanaResponse = {
  desde: string;
  hasta: string;
  dias: UltimaSemanaDia[];
  totales: UltimaSemanaTotales;
  serverTime: string;
};
