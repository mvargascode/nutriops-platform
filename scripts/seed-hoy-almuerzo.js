const mysql = require("mysql2/promise");
require("dotenv").config();

const CONFIG = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "casino_nutriops",
  },
  maxAlmuerzo: 160,
};

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getActiveUsers(conn) {
  const [rows] = await conn.query(
    `
    SELECT id
    FROM usuarios
    WHERE is_active = 1
    ORDER BY id ASC
    `,
  );
  return rows.map((r) => r.id);
}

async function main() {
  const conn = await mysql.createConnection(CONFIG.db);

  try {
    const fecha = formatDate(new Date());
    const userIds = await getActiveUsers(conn);

    if (!userIds.length) {
      throw new Error("No hay usuarios activos disponibles.");
    }

    const cantidad = Math.min(
      randInt(110, 155),
      CONFIG.maxAlmuerzo,
      userIds.length,
    );
    const selected = shuffle(userIds).slice(0, cantidad);

    await conn.query(
      `
      DELETE FROM consumos
      WHERE fecha = ? AND tipo = 2
      `,
      [fecha],
    );

    const values = selected.map((userId) => [fecha, 2, userId]);

    if (values.length) {
      await conn.query(
        `
        INSERT INTO consumos (fecha, tipo, usuario_id)
        VALUES ?
        `,
        [values],
      );
    }

    console.log(`Almuerzos cargados para hoy (${fecha}): ${values.length}`);
  } catch (error) {
    console.error("Error en seed-hoy-almuerzo:", error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
