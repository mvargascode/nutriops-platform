import { query } from "@/core/db/connection";
import type {
  AforoActualResponse,
  DebugOcupacionRow,
  OcupacionData,
  UltimaSemanaRow,
} from "./aforo.types";

export async function getAforoActual(): Promise<AforoActualResponse> {
  const rows = await query<{ aforo_total: number }>(
    "SELECT aforo_total FROM aforo WHERE id=1 LIMIT 1",
  );

  return {
    aforo_total: Number(rows[0]?.aforo_total ?? 0),
  };
}

export async function countHoyByTipo(
  fecha: string,
  tipo: number,
): Promise<number> {
  const rows = await query<{ c: number }>(
    "SELECT COUNT(*) as c FROM consumos WHERE fecha = ? AND tipo = ?",
    [fecha, tipo],
  );

  return Number(rows[0]?.c ?? 0);
}

export async function getOcupacionData(params: {
  tipo: number;
  ventanaMin: number;
  turno: number | null;
}): Promise<OcupacionData> {
  const { tipo, ventanaMin, turno } = params;

  const sqlParams: number[] = [tipo, ventanaMin];
  let whereTurno = "";

  if (turno !== null && !Number.isNaN(turno)) {
    whereTurno = " AND turno_id = ? ";
    sqlParams.splice(1, 0, turno);
  }

  const rows = await query<{ ocupacion: number; capacidad: number }>(
    `
    SELECT
      (SELECT COUNT(DISTINCT usuario_id) FROM consumos
        WHERE fecha = CURDATE()
          AND tipo = ?
          ${whereTurno}
          AND created_at >= NOW() - INTERVAL ? MINUTE
      ) AS ocupacion,
      (SELECT aforo_total FROM aforo WHERE id=1 LIMIT 1) AS capacidad
    `,
    sqlParams,
  );

  return {
    ocupacion: Number(rows[0]?.ocupacion ?? 0),
    capacidad: Number(rows[0]?.capacidad ?? 0),
  };
}

export async function getDebugOcupacion(): Promise<DebugOcupacionRow> {
  const rows = await query<DebugOcupacionRow>(`
    SELECT
      DATABASE() AS db,
      @@global.time_zone AS g_tz,
      @@session.time_zone AS s_tz,
      NOW() AS now_db,
      (SELECT COUNT(*) FROM consumos
        WHERE fecha = CURDATE()
          AND tipo = 2
          AND created_at >= NOW() - INTERVAL 30 MINUTE
      ) AS c;
  `);

  return {
    db: rows[0]?.db ?? "",
    g_tz: rows[0]?.g_tz ?? "",
    s_tz: rows[0]?.s_tz ?? "",
    now_db: rows[0]?.now_db ?? "",
    c: Number(rows[0]?.c ?? 0),
  };
}

export async function getUltimaSemanaRows(): Promise<UltimaSemanaRow[]> {
  const rows = await query<{ fecha: string; tipo: number; c: number }>(`
    SELECT fecha, tipo, COUNT(*) AS c
    FROM consumos
    WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND fecha <= CURDATE()
    GROUP BY fecha, tipo
    ORDER BY fecha ASC, tipo ASC
  `);

  return rows.map((r) => ({
    fecha: r.fecha,
    tipo: Number(r.tipo),
    c: Number(r.c ?? 0),
  }));
}