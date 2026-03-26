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
  dias: 60,
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

function isWeekend(date) {
  const day = date.getDay(); // 0 domingo, 6 sábado
  return day === 0 || day === 6;
}

function getCountsForDay(date, totalUsuarios) {
  const weekend = isWeekend(date);

  let desayuno = weekend ? randInt(15, 45) : randInt(70, 130);
  let almuerzo = weekend ? randInt(20, 55) : randInt(95, 155);
  let once = weekend ? randInt(10, 35) : randInt(40, 90);

  // Variación adicional por día
  const month = date.getMonth() + 1;
  if (month === 1 || month === 2) {
    desayuno = Math.max(10, desayuno - randInt(5, 15));
    almuerzo = Math.max(15, almuerzo - randInt(8, 20));
    once = Math.max(8, once - randInt(4, 12));
  }

  return {
    desayuno: Math.min(desayuno, CONFIG.maxPorTipo, totalUsuarios),
    almuerzo: Math.min(almuerzo, CONFIG.maxPorTipo, totalUsuarios),
    once: Math.min(once, CONFIG.maxPorTipo, totalUsuarios),
  };
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

async function clearRange(conn, desde, hasta) {
  await conn.query(
    `
    DELETE FROM consumos
    WHERE fecha BETWEEN ? AND ?
    `,
    [desde, hasta],
  );
}

async function insertBatch(conn, values) {
  if (!values.length) return;
  await conn.query(
    `
    INSERT INTO consumos (fecha, tipo, usuario_id)
    VALUES ?
    `,
    [values],
  );
}

async function main() {
  const conn = await mysql.createConnection(CONFIG.db);

  try {
    const userIds = await getActiveUsers(conn);

    if (!userIds.length) {
      throw new Error("No hay usuarios activos en la tabla usuarios.");
    }

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (CONFIG.dias - 1));

    const desde = formatDate(start);
    const hasta = formatDate(today);

    console.log(`Usuarios activos encontrados: ${userIds.length}`);
    console.log(`Limpiando consumos entre ${desde} y ${hasta}...`);

    await clearRange(conn, desde, hasta);

    let totalInsertados = 0;

    for (let i = 0; i < CONFIG.dias; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const fecha = formatDate(date);
      const counts = getCountsForDay(date, userIds.length);

      const shuffled = shuffle(userIds);

      const desayunoUsers = shuffled.slice(0, counts.desayuno);
      const almuerzoUsers = shuffled.slice(0, counts.almuerzo);
      const onceUsers = shuffled.slice(0, counts.once);

      const values = [];

      for (const userId of desayunoUsers) {
        values.push([fecha, 1, userId]);
      }
      for (const userId of almuerzoUsers) {
        values.push([fecha, 2, userId]);
      }
      for (const userId of onceUsers) {
        values.push([fecha, 3, userId]);
      }

      await insertBatch(conn, values);
      totalInsertados += values.length;

      console.log(
        `${fecha} -> desayuno: ${counts.desayuno}, almuerzo: ${counts.almuerzo}, once: ${counts.once}`,
      );
    }

    console.log(`\nSeed completado. Registros insertados: ${totalInsertados}`);
  } catch (error) {
    console.error("Error ejecutando seed de 60 días:", error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
