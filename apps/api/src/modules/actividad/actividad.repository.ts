import { query } from "../../core/db/connection";
import type { ActividadTotales } from "./actividad.types";

export async function getTotalesPorFecha(fecha: string): Promise<ActividadTotales> {
  const rows = await query<ActividadTotales>(
    `
    SELECT
      COUNT(*) AS total,
      SUM(tipo = 1) AS desayuno,
      SUM(tipo = 2) AS almuerzo,
      SUM(tipo = 3) AS once
    FROM consumos
    WHERE fecha = ?;
  `,
    [fecha],
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    desayuno: Number(rows[0]?.desayuno ?? 0),
    almuerzo: Number(rows[0]?.almuerzo ?? 0),
    once: Number(rows[0]?.once ?? 0),
  };
}

// created_at se guarda con la hora del servidor de BD (SYSTEM/UTC en produccion).
// Se devuelve crudo (con tipo) y toda conversion/comparacion contra la hora de
// Chile se hace en el service, para no arrastrar el desfase horario del server
// (y evitar el "wrap" de TIME()/CURTIME() en la ventana UTC-Chile).
export async function getRegistrosPorFecha(
  fecha: string,
): Promise<{ createdAt: string; tipo: number }[]> {
  const rows = await query<{ created_at: string; tipo: number }>(
    `SELECT created_at, tipo FROM consumos WHERE fecha = ?;`,
    [fecha],
  );

  return rows.map((r) => ({ createdAt: r.created_at, tipo: Number(r.tipo) }));
}
