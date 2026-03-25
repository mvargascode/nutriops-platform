import { pool } from "@/core/db/connection";
import type { NutriRow, NutricionItemRow } from "./nutricion.types";

export async function findDiariaByFechaTipo(
  fecha: string,
  tipo: number,
): Promise<NutricionItemRow[]> {
  const [rows] = await pool.query<any[]>(
    `
    SELECT fecha, tipo, orden, item, porcion, kcal, proteinas_g, grasas_g, carbohidratos_g, comentario
    FROM nutricion_diaria
    WHERE fecha = ? AND tipo = ?
    ORDER BY orden ASC
    `,
    [fecha, tipo],
  );

  return rows;
}

export async function findDiariaRango(
  desde: string,
  hasta: string,
): Promise<NutricionItemRow[]> {
  const [rows] = await pool.query<any[]>(
    `
    SELECT id, fecha, tipo, orden, item, porcion, kcal, proteinas_g, grasas_g, carbohidratos_g, comentario
    FROM nutricion_diaria
    WHERE fecha BETWEEN ? AND ?
    ORDER BY fecha ASC, tipo ASC, orden ASC
    `,
    [desde, hasta],
  );

  return rows;
}

export async function importNutricionRows(cleaned: NutriRow[]): Promise<{
  rowsReceived: number;
  chunks: number;
  affectedRows: number;
}> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const CHUNK_SIZE = 500;
    const parts: NutriRow[][] = [];
    for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
      parts.push(cleaned.slice(i, i + CHUNK_SIZE));
    }

    let affectedTotal = 0;

    for (const part of parts) {
      const values: Array<string | number | null> = [];
      const placeholders = part
        .map((r) => {
          values.push(
            r.fecha,
            r.tipo,
            r.orden,
            r.item,
            r.porcion,
            r.kcal,
            r.proteinas_g,
            r.grasas_g,
            r.carbohidratos_g,
            r.comentario,
          );
          return "(?,?,?,?,?,?,?,?,?,?)";
        })
        .join(",");

      const sql = `
        INSERT INTO nutricion_diaria
          (fecha, tipo, orden, item, porcion, kcal, proteinas_g, grasas_g, carbohidratos_g, comentario)
        VALUES
          ${placeholders}
        ON DUPLICATE KEY UPDATE
          porcion = VALUES(porcion),
          kcal = VALUES(kcal),
          proteinas_g = VALUES(proteinas_g),
          grasas_g = VALUES(grasas_g),
          carbohidratos_g = VALUES(carbohidratos_g),
          comentario = VALUES(comentario)
      `;

      const [result] = await conn.query<any>(sql, values);
      affectedTotal += Number(result?.affectedRows ?? 0);
    }

    await conn.commit();

    return {
      rowsReceived: cleaned.length,
      chunks: parts.length,
      affectedRows: affectedTotal,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
