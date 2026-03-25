import { query } from "../../core/db/connection";
import { UsuarioDB } from "./kiosk.types";

function getTipoPorHorario(): { tipo: 1 | 2 | 3; label: string } | null {
  const now = new Date();
  const hour = now.getHours();

  // 07:00 - 09:00
  if (hour >= 7 && hour < 9) {
    return { tipo: 1, label: "Desayuno" };
  }

  // 11:00 - 16:00
  if (hour >= 11 && hour < 16) {
    return { tipo: 2, label: "Almuerzo" };
  }

  // 20:00 - 23:59
  if (hour >= 20 && hour <= 23) {
    return { tipo: 3, label: "Cena" };
  }

  return null;
}

function limpiarRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
}

export async function emitirTicket(rutInput: string) {
  const rut = limpiarRut(rutInput);

  const horario = getTipoPorHorario();
  if (!horario) {
    return { ok: false, message: "Fuera de horario de servicio" };
  }

  const usuarios = await query<UsuarioDB>(
    `SELECT id, rut, nombre, unidad_id, is_active
     FROM usuarios
     WHERE REPLACE(REPLACE(rut,'.',''),'-','') = ?`,
    [rut],
  );

  if (!usuarios.length) {
    return { ok: false, message: "Usuario no encontrado" };
  }

  const usuario = usuarios[0];

  if (!usuario.is_active) {
    return { ok: false, message: "Usuario inactivo" };
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const duplicado = await query(
    `SELECT id FROM consumos
     WHERE fecha = ?
     AND tipo = ?
     AND usuario_id = ?
     LIMIT 1`,
    [hoy, horario.tipo, usuario.id],
  );

  if (duplicado.length) {
    return { ok: false, message: "Ya retiró esta comida hoy" };
  }

  await query(
    `INSERT INTO consumos (fecha, tipo, usuario_id)
     VALUES (?, ?, ?)`,
    [hoy, horario.tipo, usuario.id],
  );

  const now = new Date();
  const hora = now.toTimeString().slice(0, 5);

  return {
    ok: true,
    tipo: horario.tipo,
    tipoLabel: horario.label,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      rut: usuario.rut,
    },
    fecha: hoy,
    hora,
  };
}
