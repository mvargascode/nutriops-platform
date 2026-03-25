import { pool } from "@/core/db/connection";

export type MenuRow = {
  id: number;
  fecha: string;
  tipo: number;
  orden: number;
  item: string;
  porcion: string | null;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario: string | null;
};

type ListMenuFilters = {
  fecha?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
};

type UpdateMenuInput = {
  fecha?: string;
  tipo?: number;
  orden?: number;
  item?: string;
  porcion?: string | null;
  kcal?: number | null;
  proteinas_g?: number | null;
  grasas_g?: number | null;
  carbohidratos_g?: number | null;
  comentario?: string | null;
};

export async function listMenu(filters: ListMenuFilters): Promise<MenuRow[]> {
  let sql = `
    SELECT
      id,
      DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
      tipo,
      orden,
      item,
      porcion,
      kcal,
      proteinas_g,
      grasas_g,
      carbohidratos_g,
      comentario
    FROM nutricion_diaria
    WHERE 1=1
  `;

  const params: any[] = [];

  if (filters.fecha) {
    sql += ` AND fecha = ?`;
    params.push(filters.fecha);
  }

  if (filters.desde && filters.hasta) {
    sql += ` AND fecha BETWEEN ? AND ?`;
    params.push(filters.desde, filters.hasta);
  } else if (filters.desde) {
    sql += ` AND fecha = ?`;
    params.push(filters.desde);
  } else if (filters.hasta) {
    sql += ` AND fecha = ?`;
    params.push(filters.hasta);
  }

  if (filters.tipo) {
    sql += ` AND tipo = ?`;
    params.push(Number(filters.tipo));
  }

  sql += ` ORDER BY fecha ASC, tipo ASC, orden ASC, id ASC`;

  const [rows] = await pool.query(sql, params);
  return rows as MenuRow[];
}

export async function getMenuById(id: number): Promise<MenuRow | null> {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
      tipo,
      orden,
      item,
      porcion,
      kcal,
      proteinas_g,
      grasas_g,
      carbohidratos_g,
      comentario
    FROM nutricion_diaria
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  const data = rows as MenuRow[];
  return data[0] ?? null;
}

export async function updateMenuById(
  id: number,
  payload: UpdateMenuInput
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = [
    "fecha",
    "tipo",
    "orden",
    "item",
    "porcion",
    "kcal",
    "proteinas_g",
    "grasas_g",
    "carbohidratos_g",
    "comentario",
  ] as const;

  for (const key of allowedFields) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(payload[key]);
    }
  }

  if (!fields.length) return false;

  values.push(id);

  const [result]: any = await pool.query(
    `
    UPDATE nutricion_diaria
    SET ${fields.join(", ")}
    WHERE id = ?
    `,
    values
  );

  return result.affectedRows > 0;
}

export async function deleteMenuById(id: number): Promise<boolean> {
  const [result]: any = await pool.query(
    `DELETE FROM nutricion_diaria WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}