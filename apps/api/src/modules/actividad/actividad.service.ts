import { getRegistrosPorFecha, getTotalesPorFecha } from "./actividad.repository";
import type {
  ActividadHoyResponse,
  ActividadHoyStreamPayload,
  ActividadPorHoraItem,
  ActividadStreamBuildResult,
  ActividadTotales,
} from "./actividad.types";

const TZ = "America/Santiago";

function getChileDateYmd(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getChileYesterdayYmd(): string {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getChileDateYmd(ayer);
}

// consumos.created_at se guarda con la hora del servidor de BD (SYSTEM/UTC en
// produccion), por eso se interpreta el string crudo como UTC y se convierte
// a hora de Chile aqui, en vez de usar HOUR()/TIME()/CURTIME() en el SQL
// (esas funciones "envuelven" mal cerca de la medianoche por el desfase UTC-Chile).
function getChileTimeParts(mysqlDatetime: string) {
  const utcDate = new Date(`${mysqlDatetime.replace(" ", "T")}Z`);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(utcDate);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");

  let hour = get("hour");
  if (hour === 24) hour = 0;

  return { hour, minute: get("minute"), second: get("second") };
}

function getChileNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");

  let hour = get("hour");
  if (hour === 24) hour = 0;

  return { hour, minute: get("minute"), second: get("second") };
}

function secondsSinceMidnight({
  hour,
  minute,
  second,
}: {
  hour: number;
  minute: number;
  second: number;
}) {
  return hour * 3600 + minute * 60 + second;
}

function sumTotales(registros: { tipo: number }[]): ActividadTotales {
  const totales = { total: 0, desayuno: 0, almuerzo: 0, once: 0 };

  for (const r of registros) {
    totales.total += 1;
    if (r.tipo === 1) totales.desayuno += 1;
    if (r.tipo === 2) totales.almuerzo += 1;
    if (r.tipo === 3) totales.once += 1;
  }

  return totales;
}

async function getHoyPorHora(fecha: string): Promise<ActividadPorHoraItem[]> {
  const registros = await getRegistrosPorFecha(fecha);

  const counts = new Map<number, number>();
  for (const r of registros) {
    const { hour } = getChileTimeParts(r.createdAt);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([hora, cantidad]) => ({ hora, cantidad }))
    .sort((a, b) => a.hora - b.hora);
}

async function getTotalesAyerHastaEstaHora(fechaAyer: string): Promise<ActividadTotales> {
  const registros = await getRegistrosPorFecha(fechaAyer);
  const nowSec = secondsSinceMidnight(getChileNowParts());

  const filtrados = registros.filter(
    (r) => secondsSinceMidnight(getChileTimeParts(r.createdAt)) <= nowSec,
  );

  return sumTotales(filtrados);
}

export async function getActividadHoy(): Promise<ActividadHoyResponse> {
  const fechaHoy = getChileDateYmd();
  const fechaAyer = getChileYesterdayYmd();

  const [totHoy, porHora, ayerHastaAhora, ayerDia] = await Promise.all([
    getTotalesPorFecha(fechaHoy),
    getHoyPorHora(fechaHoy),
    getTotalesAyerHastaEstaHora(fechaAyer),
    getTotalesPorFecha(fechaAyer),
  ]);

  const delta = totHoy.total - ayerHastaAhora.total;
  const pct =
    ayerHastaAhora.total > 0
      ? Math.round((delta / ayerHastaAhora.total) * 100)
      : null;

  return {
    fecha: fechaHoy,
    total: totHoy.total,
    desayuno: totHoy.desayuno,
    almuerzo: totHoy.almuerzo,
    once: totHoy.once,
    porHora,
    ayerHastaAhora,
    comparacion: { delta, pct },
    ayerTotalDia: ayerDia.total,
    ayerDia,
    serverTime: new Date().toISOString(),
  };
}

export async function buildActividadHoyStreamPayload(): Promise<ActividadStreamBuildResult> {
  const base = await getActividadHoy();

  const payload: ActividadHoyStreamPayload = {
    ...base,
    ts: Date.now(),
  };

  const fp = JSON.stringify({
    total: payload.total,
    desayuno: payload.desayuno,
    almuerzo: payload.almuerzo,
    once: payload.once,
    porHora: payload.porHora,
    ayerHastaAhora: payload.ayerHastaAhora.total,
    ayerTotalDia: payload.ayerTotalDia,
  });

  return { payload, fp };
}
