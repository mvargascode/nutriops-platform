import { pool } from "@/core/db/connection";

const WINDOWS: Record<number, [number, number]> = {
    1: [7, 9],
    2: [11, 16],
    3: [20, 24],
};

async function main() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

  let tipo: number | null = null;
    for (const [t, [start, end]] of Object.entries(WINDOWS)) {
          if (hour >= start && hour < end) tipo = Number(t);
    }

  if (!tipo) {
        console.log("Fuera de horario de servicio (desayuno 7-9, almuerzo 11-16, cena 20-24). Sin actividad que simular.");
        process.exit(0);
  }

  const [startH, endH] = WINDOWS[tipo];
    const windowMinutes = (endH - startH) * 60;
    const elapsedMinutes = (hour - startH) * 60 + minute;
    const progress = Math.min(1, Math.max(0, elapsedMinutes / windowMinutes));

  const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const fecha = `${yyyy}-${mm}-${dd}`;

  const [totalRows]: any = await pool.query(
        `SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'User' AND is_active = 1`
      );
    const totalUsers = totalRows[0]?.n ?? 0;

  const [servedRows]: any = await pool.query(
        `SELECT COUNT(*) AS n FROM consumos WHERE fecha = ? AND tipo = ?`,
        [fecha, tipo]
      );
    const alreadyServed = servedRows[0]?.n ?? 0;

  const targetServed = Math.round(totalUsers * progress);
    const jitter = Math.floor(Math.random() * 3);
    const toInsert = Math.max(0, targetServed - alreadyServed + jitter);

  if (toInsert === 0) {
        console.log(`Ritmo al dia (${alreadyServed}/${totalUsers} servidos, progreso ${(progress * 100).toFixed(0)}%). Sin nuevos tickets este ciclo.`);
        process.exit(0);
  }

  const [rows]: any = await pool.query(
        `SELECT u.id FROM usuarios u
             WHERE u.rol = 'User' AND u.is_active = 1
                  AND u.id NOT IN (
                         SELECT usuario_id FROM consumos WHERE fecha = ? AND tipo = ? AND usuario_id IS NOT NULL
                              )
                                   ORDER BY RAND()
                                        LIMIT ?`,
        [fecha, tipo, toInsert]
      );

  if (!rows || rows.length === 0) {
        console.log("Todos los usuarios ya registraron este turno hoy.");
        process.exit(0);
  }

  for (const row of rows) {
        await pool.query(
                `INSERT INTO consumos (fecha, tipo, usuario_id, created_at) VALUES (?, ?, ?, NOW())`,
                [fecha, tipo, row.id]
              );
  }

  console.log(`Se registraron ${rows.length} tickets (tipo=${tipo}, progreso=${(progress * 100).toFixed(0)}%, total hoy=${alreadyServed + rows.length}/${totalUsers}).`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Error en simulate-activity job:", err);
    process.exit(1);
});
