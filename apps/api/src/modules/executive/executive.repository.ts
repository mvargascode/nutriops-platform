import { pool } from "../../core/db/connection";

export async function getTodayTotal(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM consumos
    WHERE fecha = ${refSql};
    `,
    params,
  );

  return Number((rows as any[])[0]?.total ?? 0);
}

export async function getTodayDistribution(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN tipo = 1 THEN 1 ELSE 0 END) AS desayuno,
      SUM(CASE WHEN tipo = 2 THEN 1 ELSE 0 END) AS almuerzo,
      SUM(CASE WHEN tipo = 3 THEN 1 ELSE 0 END) AS cena
    FROM consumos
    WHERE fecha = ${refSql};
    `,
    params,
  );

  const row = (rows as any[])[0] ?? {};

  return {
    desayuno: Number(row.desayuno ?? 0),
    almuerzo: Number(row.almuerzo ?? 0),
    cena: Number(row.cena ?? 0),
  };
}

export async function getWeekTotal(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM consumos
    WHERE YEARWEEK(fecha, 1) = YEARWEEK(${refSql}, 1);
    `,
    params,
  );

  return Number((rows as any[])[0]?.total ?? 0);
}

export async function getPreviousWeekTotal(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM consumos
    WHERE YEARWEEK(fecha, 1) = YEARWEEK(DATE_SUB(${refSql}, INTERVAL 7 DAY), 1);
    `,
    params,
  );

  return Number((rows as any[])[0]?.total ?? 0);
}

export async function getMonthTotal(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM consumos
    WHERE YEAR(fecha) = YEAR(${refSql})
      AND MONTH(fecha) = MONTH(${refSql});
    `,
    [...params, ...params],
  );

  return Number((rows as any[])[0]?.total ?? 0);
}

export async function getPreviousMonthTotal(refSql: string, params: any[]) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM consumos
    WHERE fecha >= DATE_FORMAT(DATE_SUB(${refSql}, INTERVAL 1 MONTH), '%Y-%m-01')
      AND fecha <  DATE_FORMAT(${refSql}, '%Y-%m-01');
    `,
    [...params, ...params],
  );

  return Number((rows as any[])[0]?.total ?? 0);
}

export async function getTrend30d(startTrend: string, refDateISO: string) {
  const [rows] = await pool.query(
    `
    SELECT fecha, COUNT(*) AS total
    FROM consumos
    WHERE fecha BETWEEN DATE(?) AND DATE(?)
    GROUP BY fecha
    ORDER BY fecha ASC;
    `,
    [startTrend, refDateISO],
  );

  return rows as Array<{ fecha: string; total: number }>;
}
