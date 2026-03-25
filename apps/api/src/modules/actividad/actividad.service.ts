import {
  getHoyPorHora,
  getTotalesAyerDia,
  getTotalesAyerHastaEstaHora,
  getTotalesHoy,
} from "./actividad.repository";
import type {
  ActividadHoyResponse,
  ActividadHoyStreamPayload,
  ActividadStreamBuildResult,
} from "./actividad.types";

export async function getActividadHoy(): Promise<ActividadHoyResponse> {
  const [totHoy, porHora, ayerHastaAhora, ayerDia] = await Promise.all([
    getTotalesHoy(),
    getHoyPorHora(),
    getTotalesAyerHastaEstaHora(),
    getTotalesAyerDia(),
  ]);

  const delta = totHoy.total - ayerHastaAhora.total;
  const pct =
    ayerHastaAhora.total > 0
      ? Math.round((delta / ayerHastaAhora.total) * 100)
      : null;

  return {
    fecha: new Date().toISOString().slice(0, 10),
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
