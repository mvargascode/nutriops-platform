import { pool } from "@/core/db/connection";

async function main() {
  const now = new Date();
  const hour = now.getHours();

  let tipo: number | null = null;
  if (hour >= 7 && hour < 9) tipo = 1;
  else if (hour >= 11 && hour < 16) tipo = 2;
  else if (hour >= 20 && hour <= 23) tipo = 3;

  if (!tipo) {
    console.log("Fuera de horario de servicio (desayuno 7-9, almuerzo 11-16, cena 20-24). Sin actividad que simular.");
    process.exit(0);
  }

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const fecha = `${yyyy}-${mm}-${dd}`;

  const [rows]: any = await pool.query(
    `SELECT u.id FROM usuarios u
     WHERE u.rol = 'User' AND u.is_active = 1
     AND u.id NOT IN (
       SELECT usuario_id FROM consumos WHERE fecha = ? AND tipo = ? AND usuario_id IS NOT NULL
     )`,
    [fecha, tipo]
  );

  if (!rows || rows.length === 0) {
    console.log("Todos los usuarios ya registraron este turno hoy.");
    process.exit(0);
  }

  const batchSize = Math.min(rows.length, 2 + Math.floor(Math.random() * 6));
  const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, batchSize);

  for (const row of shuffled) {
    await pool.query(
      `INSERT INTO consumos (fecha, tipo, usuario_id, created_at) VALUES (?, ?, ?, NOW())`,
      [fecha, tipo, row.id]
    );
  }

  console.log(`Se registraron ${shuffled.length} tickets simulados (tipo=${tipo}, fecha=${fecha}).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en simulate-activity job:", err);
  process.exit(1);
});
