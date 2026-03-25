import { pool } from "../../core/db/connection";
import type {
  InsertUserInput,
  ListUsersParams,
  UpdateUserInput,
  UserListItem,
} from "./users.types";

export async function findUsers(params: ListUsersParams) {
  const { q = "", unidad_id = null, status = "active", limit, offset } = params;

  const sqlParams: unknown[] = [];
  const whereParts: string[] = [];

  if (status === "active") {
    whereParts.push("u.is_active = 1");
  } else if (status === "inactive") {
    whereParts.push("u.is_active = 0");
  }

  if (q.trim()) {
    whereParts.push("(u.rut LIKE ? OR u.nombre LIKE ?)");
    sqlParams.push(`%${q.trim()}%`, `%${q.trim()}%`);
  }

  if (unidad_id && !Number.isNaN(unidad_id)) {
    whereParts.push("u.unidad_id = ?");
    sqlParams.push(unidad_id);
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const sql = `
    SELECT
      u.id,
      u.rut,
      u.nombre,
      u.unidad_id,
      un.nombre AS unidad_nombre,
      u.email,
      u.username,
      u.rol,
      u.is_active,
      u.created_at
    FROM usuarios u
    LEFT JOIN unidades un ON un.id = u.unidad_id
    ${where}
    ORDER BY u.id DESC
    LIMIT ?
    OFFSET ?
  `;

  const [rows] = await pool.query(sql, [...sqlParams, limit, offset]);

  const [countRows]: any = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM usuarios u
    LEFT JOIN unidades un ON un.id = u.unidad_id
    ${where}
    `,
    sqlParams,
  );

  return {
    rows: rows as UserListItem[],
    total: countRows[0]?.total ?? 0,
  };
}

export async function findUserById(id: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      u.id,
      u.rut,
      u.nombre,
      u.unidad_id,
      un.nombre AS unidad_nombre,
      u.email,
      u.username,
      u.rol,
      u.is_active,
      u.created_at
    FROM usuarios u
    LEFT JOIN unidades un ON un.id = u.unidad_id
    WHERE u.id = ?
    LIMIT 1
    `,
    [id],
  );

  return rows[0] ?? null;
}

export async function findDuplicateUser(
  rut: string,
  email: string | null,
  username: string | null,
) {
  const conditions: string[] = ["rut = ?"];
  const params: unknown[] = [rut];

  if (email) {
    conditions.push("email = ?");
    params.push(email);
  }

  if (username) {
    conditions.push("username = ?");
    params.push(username);
  }

  const [rows]: any = await pool.query(
    `SELECT id FROM usuarios WHERE ${conditions.join(" OR ")}`,
    params,
  );

  return rows;
}

export async function findDuplicateUserExcludingId(
  id: number,
  email: string | null,
  username: string | null,
) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (email) {
    conditions.push("email = ?");
    params.push(email);
  }

  if (username) {
    conditions.push("username = ?");
    params.push(username);
  }

  if (!conditions.length) return [];

  params.push(id);

  const [rows]: any = await pool.query(
    `SELECT id FROM usuarios WHERE (${conditions.join(" OR ")}) AND id <> ?`,
    params,
  );

  return rows;
}

export async function insertUser(
  data: InsertUserInput,
  passwordHash: string | null,
) {
  const {
    rut,
    nombre,
    unidad = null,
    email = null,
    username = null,
    rol = "User",
  } = data;

  const [result]: any = await pool.query(
    `
    INSERT INTO usuarios
      (rut, nombre, unidad_id, email, username, password_hash, rol, is_active)
    VALUES (?,?,?,?,?,?,?,1)
    `,
    [rut, nombre, unidad, email, username, passwordHash, rol],
  );

  return result;
}

export async function updateUserById(
  id: number,
  data: UpdateUserInput,
  passwordHash?: string | null,
): Promise<boolean> {
  const set: string[] = [];
  const params: unknown[] = [];

  if (data.rol) {
    set.push("rol = ?");
    params.push(data.rol);
  }

  if (typeof data.is_active === "number") {
    set.push("is_active = ?");
    params.push(data.is_active);
  }

  if (typeof data.unidad !== "undefined") {
    set.push("unidad_id = ?");
    params.push(data.unidad);
  }

  if (typeof data.email !== "undefined") {
    set.push("email = ?");
    params.push(data.email);
  }

  if (typeof data.username !== "undefined") {
    set.push("username = ?");
    params.push(data.username);
  }

  if (passwordHash !== undefined) {
    set.push("password_hash = ?");
    params.push(passwordHash);
  }

  if (!set.length) {
    return false;
  }

  params.push(id);

  const [result]: any = await pool.query(
    `UPDATE usuarios SET ${set.join(", ")} WHERE id = ?`,
    params,
  );

  return result.affectedRows > 0;
}

export async function setUserActiveStatus(
  id: number,
  is_active: 0 | 1,
): Promise<boolean> {
  const [result]: any = await pool.query(
    `UPDATE usuarios SET is_active = ? WHERE id = ?`,
    [is_active, id],
  );

  return result.affectedRows > 0;
}

export async function deleteUserById(id: number): Promise<boolean> {
  const [result]: any = await pool.query(`DELETE FROM usuarios WHERE id = ?`, [
    id,
  ]);

  return result.affectedRows > 0;
}