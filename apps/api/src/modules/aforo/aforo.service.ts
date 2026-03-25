import {
  countHoyByTipo,
  getAforoActual,
  getDebugOcupacion,
  getOcupacionData,
  getUltimaSemanaRows,
} from "./aforo.repository";
import type {
  AforoHoyDetalleItem,
  AforoHoyPorTipoResponse,
  AforoHoyResumenResponse,
  OcupacionParams,
  OcupacionResponse,
  OcupacionStreamBuildResult,
  UltimaSemanaDia,
  UltimaSemanaResponse,
} from "./aforo.types";

export function parseTipo(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;

  const tipo = Number(value);

  if (!Number.isInteger(tipo) || tipo < 1 || tipo > 3) {
    throw new Error("Parámetro 'tipo' inválido. Debe ser 1, 2 o 3.");
  }

  return tipo;
}

export function parseOcupacionParams(query: {
  tipo?: unknown;
  ventanaMin?: unknown;
  turno?: unknown;
}): OcupacionParams {
  const tipoRaw = query.tipo ?? 2;
  const tipo = Number(tipoRaw);

  if (!Number.isInteger(tipo) || tipo < 1 || tipo > 3) {
    throw new Error("Parámetro 'tipo' inválido. Debe ser 1, 2 o 3.");
  }

  const ventanaMinRaw = Number(query.ventanaMin ?? 30);
  if (!Number.isFinite(ventanaMinRaw)) {
    throw new Error("Parámetro 'ventanaMin' inválido.");
  }

  const ventanaMin = Math.max(5, Math.min(180, ventanaMinRaw));

  let turno: number | null = null;
  if (query.turno !== undefined && query.turno !== null && query.turno !== "") {
    const turnoNum = Number(query.turno);

    if (!Number.isInteger(turnoNum) || turnoNum < 1) {
      throw new Error("Parámetro 'turno' inválido.");
    }

    turno = turnoNum;
  }

  return {
    tipo,
    ventanaMin,
    turno,
  };
}

export async function getAforoActualService() {
  return getAforoActual();
}

export async function getAforoHoyService(
  tipo: number | null,
): Promise<AforoHoyPorTipoResponse | AforoHoyResumenResponse> {
  const today = new Date().toISOString().slice(0, 10);

  if (tipo) {
    const cantidad = await countHoyByTipo(today, tipo);
    return { fecha: today, tipo, cantidad };
  }

  const tipos = [1, 2, 3] as const;
  const detalle: AforoHoyDetalleItem[] = await Promise.all(
    tipos.map(async (t) => ({
      tipo: t,
      cantidad: await countHoyByTipo(today, t),
    })),
  );

  const total = detalle.reduce((acc, item) => acc + item.cantidad, 0);

  return {
    fecha: today,
    detalle,
    total,
  };
}

export async function getOcupacionService(
  params: OcupacionParams,
): Promise<OcupacionResponse> {
  const { ocupacion, capacidad } = await getOcupacionData(params);

  const porcentaje = capacidad
    ? Math.min(100, Math.max(0, Math.round((ocupacion / capacidad) * 100)))
    : 0;

  return {
    tipo: params.tipo,
    turno: params.turno,
    ventanaMin: params.ventanaMin,
    ocupacion,
    capacidad,
    porcentaje,
    serverTime: new Date().toISOString(),
  };
}

export async function buildOcupacionStreamPayload(
  params: OcupacionParams,
): Promise<OcupacionStreamBuildResult> {
  const base = await getOcupacionService(params);

  const payload = {
    ...base,
    ts: Date.now(),
  };

  const fp = JSON.stringify({
    tipo: payload.tipo,
    turno: payload.turno,
    ventanaMin: payload.ventanaMin,
    ocupacion: payload.ocupacion,
    capacidad: payload.capacidad,
    porcentaje: payload.porcentaje,
  });

  return { payload, fp };
}

export async function getDebugOcupacionService() {
  return getDebugOcupacion();
}

export async function getUltimaSemanaService(): Promise<UltimaSemanaResponse> {
  const rows = await getUltimaSemanaRows();

  const map = new Map<
    string,
    { desayuno: number; almuerzo: number; once: number }
  >();

  for (const r of rows) {
    if (!map.has(r.fecha)) {
      map.set(r.fecha, { desayuno: 0, almuerzo: 0, once: 0 });
    }

    const ref = map.get(r.fecha)!;

    if (r.tipo === 1) ref.desayuno = r.c;
    if (r.tipo === 2) ref.almuerzo = r.c;
    if (r.tipo === 3) ref.once = r.c;
  }

  const dias: UltimaSemanaDia[] = [];
  const today = new Date();

  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  const desdeDate = new Date(today);
  desdeDate.setDate(today.getDate() - 6);

  for (let i = 0; i < 7; i++) {
    const d = new Date(desdeDate);
    d.setDate(desdeDate.getDate() + i);

    const fecha = ymd(d);
    const v = map.get(fecha) ?? { desayuno: 0, almuerzo: 0, once: 0 };
    const total = v.desayuno + v.almuerzo + v.once;

    dias.push({
      fecha,
      desayuno: v.desayuno,
      almuerzo: v.almuerzo,
      once: v.once,
      total,
    });
  }

  const totales = dias.reduce(
    (acc, x) => {
      acc.desayuno += x.desayuno;
      acc.almuerzo += x.almuerzo;
      acc.once += x.once;
      acc.total += x.total;
      return acc;
    },
    { desayuno: 0, almuerzo: 0, once: 0, total: 0 },
  );

  return {
    desde: ymd(desdeDate),
    hasta: ymd(today),
    dias,
    totales,
    serverTime: new Date().toISOString(),
  };
}
