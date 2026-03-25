import { query } from "../../core/db/connection";
import type { ConsumoDiaRow, ReportTipo } from "./reports.types";

export async function fetchSeriesByRange(
  from: string,
  to: string,
  tipo: ReportTipo,
): Promise<ConsumoDiaRow[]> {
  const whereTipo = tipo === "all" ? "" : " AND tipo = ? ";
  const paramsBase: any[] = [from, to];
  const params = tipo === "all" ? paramsBase : [...paramsBase, tipo];

  const sql = `
    SELECT
      DATE(fecha) AS fecha,
      SUM(CASE WHEN tipo = 1 THEN 1 ELSE 0 END) AS d1,
      SUM(CASE WHEN tipo = 2 THEN 1 ELSE 0 END) AS d2,
      SUM(CASE WHEN tipo = 3 THEN 1 ELSE 0 END) AS d3,
      COUNT(*) AS total
    FROM consumos
    WHERE fecha BETWEEN ? AND ?
    ${whereTipo}
    GROUP BY DATE(fecha)
    ORDER BY DATE(fecha) ASC
  `;

  const rows = await query<any>(sql, params);

  return rows.map((r: any) => ({
    fecha: String(r.fecha).slice(0, 10),
    d1: Number(r.d1 ?? 0),
    d2: Number(r.d2 ?? 0),
    d3: Number(r.d3 ?? 0),
    total: Number(r.total ?? 0),
  }));
}

export async function fetchPorTipoByRange(
  from: string,
  to: string,
  tipo: ReportTipo,
): Promise<{ "1": number; "2": number; "3": number }> {
  const whereTipo = tipo === "all" ? "" : " AND tipo = ? ";
  const paramsBase: any[] = [from, to];
  const params = tipo === "all" ? paramsBase : [...paramsBase, tipo];

  const sql = `
    SELECT tipo, COUNT(*) AS total
    FROM consumos
    WHERE fecha BETWEEN ? AND ?
    ${whereTipo}
    GROUP BY tipo
  `;

  const rows = await query<{ tipo: number; total: number }>(sql, params);

  const por_tipo: { "1": number; "2": number; "3": number } = {
    "1": 0,
    "2": 0,
    "3": 0,
  };

  for (const r of rows as any[]) {
    const t = String(r.tipo);
    if (t === "1" || t === "2" || t === "3") {
      por_tipo[t] = Number(r.total ?? 0);
    }
  }

  return por_tipo;
}
