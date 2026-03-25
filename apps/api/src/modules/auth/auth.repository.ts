import { pool } from "../../core/db/connection";

export async function findUserByLogin(login: string) {
  const [rows] = await pool.query(
    `SELECT id, nombre, rut, unidad_id, email, username, rol, is_active, password_hash
     FROM usuarios
     WHERE email=? OR username=? OR rut=?
     LIMIT 1`,
    [login, login, login],
  );

  return (rows as any[])[0] || null;
}

export async function findUserById(id: number) {
  const [rows] = await pool.query(
    `SELECT id, nombre, email, username, rol, is_active
     FROM usuarios
     WHERE id=?
     LIMIT 1`,
    [id],
  );

  return (rows as any[])[0] || null;
}
