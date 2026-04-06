import { query } from "../../core/db/connection";
import type { ActividadPorHoraItem, ActividadTotales } from "./actividad.types";

export async function getTotalesHoy(): Promise<ActividadTotales> {
  const rows = await query<ActividadTotales>(`
    SELECT
      COUNT(*) AS total,
      SUM(tipo = 1) AS desayuno,
      SUM(tipo = 2) AS almuerzo,
      SUM(tipo = 3) AS once
    FROM consumos
    WHERE fecha = CURDATE();
  `);

  return {
    total: Number(rows[0]?.total ?? 0),
    desayuno: Number(rows[0]?.desayuno ?? 0),
    almuerzo: Number(rows[0]?.almuerzo ?? 0),
    once: Number(rows[0]?.once ?? 0),
  };
}

export async function getHoyPorHora(): Promise<ActividadPorHoraItem[]> {
  const rows = await query<{ hora: number; cantidad: number }>(`
    SELECT
      HOUR(created_at) AS hora,
      COUNT(*) AS cantidad
    FROM consumos
    WHERE fecha = CURDATE()
      AND created_at <= NOW()
    GROUP BY HOUR(created_at)
    ORDER BY hora;
  `);

  return rows.map((r) => ({
    hora: Number(r.hora),
    cantidad: Number(r.cantidad),
  }));
}

export async function getTotalesAyerHastaEstaHora(): Promise<ActividadTotales> {
  const rows = await query<ActividadTotales>(`
    SELECT
      COUNT(*) AS total,
      SUM(tipo = 1) AS desayuno,
      SUM(tipo = 2) AS almuerzo,
      SUM(tipo = 3) AS once
    FROM consumos
    WHERE fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      AND TIME(created_at) <= CURTIME();
  `);

  return {
    total: Number(rows[0]?.total ?? 0),
    desayuno: Number(rows[0]?.desayuno ?? 0),
    almuerzo: Number(rows[0]?.almuerzo ?? 0),
    once: Number(rows[0]?.once ?? 0),
  };
}

export async function getTotalesAyerDia(): Promise<ActividadTotales> {
  const rows = await query<ActividadTotales>(`
    SELECT
      COUNT(*) AS total,
      SUM(tipo = 1) AS desayuno,
      SUM(tipo = 2) AS almuerzo,
      SUM(tipo = 3) AS once
    FROM consumos
    WHERE fecha = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
  `);

  return {
    total: Number(rows[0]?.total ?? 0),
    desayuno: Number(rows[0]?.desayuno ?? 0),
    almuerzo: Number(rows[0]?.almuerzo ?? 0),
    once: Number(rows[0]?.once ?? 0),
  };
}