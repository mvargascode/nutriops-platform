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
  maxPorTipo: 160,
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

    const desayunoCount = Math.min(
      randInt(80, 130),
      CONFIG.maxPorTipo,
      userIds.length,
    );
    const almuerzoCount = Math.min(
      randInt(110, 155),
      CONFIG.maxPorTipo,
      userIds.length,
    );

    const shuffled1 = shuffle(userIds);
    const shuffled2 = shuffle(userIds);

    const desayunoUsers = shuffled1.slice(0, desayunoCount);
    const almuerzoUsers = shuffled2.slice(0, almuerzoCount);

    await conn.query(
      `
      DELETE FROM consumos
      WHERE fecha = ? AND tipo IN (1, 2)
      `,
      [fecha],
    );

    const values = [
      ...desayunoUsers.map((userId) => [fecha, 1, userId]),
      ...almuerzoUsers.map((userId) => [fecha, 2, userId]),
    ];

    if (values.length) {
      await conn.query(
        `
        INSERT INTO consumos (fecha, tipo, usuario_id)
        VALUES ?
        `,
        [values],
      );
    }

    console.log(
      `Consumos cargados para hoy (${fecha}) -> desayuno: ${desayunoUsers.length}, almuerzo: ${almuerzoUsers.length}`,
    );
  } catch (error) {
    console.error("Error en seed-hoy-desayuno-almuerzo:", error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
