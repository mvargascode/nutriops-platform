const mysql = require("mysql2/promise");
require("dotenv").config();

const CONFIG = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "r00t.m1lt0n",
    database: process.env.DB_NAME || "casino_nutriops",
  },
  dias: 60,
  maxPorTipo: 160,
};

function formatDateChile(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getChileNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";

  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
  );
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
  const day = date.getDay();
  return day === 0 || day === 6;
}

function toMysqlDatetime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function randomTimeForTipo(fecha, tipo) {
  let startHour, startMin, endHour, endMin;

  if (tipo === 1) {
    startHour = 7;
    startMin = 0;
    endHour = 9;
    endMin = 45;
  } else if (tipo === 2) {
    startHour = 11;
    startMin = 30;
    endHour = 15;
    endMin = 0;
  } else {
    startHour = 16;
    startMin = 30;
    endHour = 19;
    endMin = 30;
  }

  const start = new Date(`${fecha}T00:00:00`);
  start.setHours(startHour, startMin, 0, 0);

  const end = new Date(`${fecha}T00:00:00`);
  end.setHours(endHour, endMin, 59, 999);

  const todayChile = formatDateChile();
  const nowChile = getChileNow();

  let realEnd = end;

  if (fecha === todayChile && nowChile < end) {
    realEnd = nowChile;
  }

  if (realEnd <= start) {
    realEnd = new Date(start.getTime() + 60 * 1000);
  }

  const randomTs = randInt(start.getTime(), realEnd.getTime());
  return toMysqlDatetime(new Date(randomTs));
}

function getCountsForDay(date, totalUsuarios) {
  const weekend = isWeekend(date);

  let desayuno = weekend ? randInt(15, 45) : randInt(70, 130);
  let almuerzo = weekend ? randInt(20, 55) : randInt(95, 155);
  let once = weekend ? randInt(10, 35) : randInt(40, 90);

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
  const [rows] = await conn.query(`
    SELECT id
    FROM usuarios
    WHERE is_active = 1
    ORDER BY id ASC
  `);

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
    INSERT INTO consumos (fecha, tipo, usuario_id, created_at)
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

    const today = getChileNow();
    const start = new Date(today);
    start.setDate(today.getDate() - (CONFIG.dias - 1));

    const desde = formatDateLocal(start);
    const hasta = formatDateChile(today);

    console.log(`Usuarios activos encontrados: ${userIds.length}`);
    console.log(`Limpiando consumos entre ${desde} y ${hasta}...`);

    await clearRange(conn, desde, hasta);

    let totalInsertados = 0;

    for (let i = 0; i < CONFIG.dias; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const fecha = formatDateLocal(date);
      const counts = getCountsForDay(date, userIds.length);

      const desayunoUsers = shuffle(userIds).slice(0, counts.desayuno);
      const almuerzoUsers = shuffle(userIds).slice(0, counts.almuerzo);
      const onceUsers = shuffle(userIds).slice(0, counts.once);

      const values = [];

      for (const userId of desayunoUsers) {
        values.push([fecha, 1, userId, randomTimeForTipo(fecha, 1)]);
      }

      for (const userId of almuerzoUsers) {
        values.push([fecha, 2, userId, randomTimeForTipo(fecha, 2)]);
      }

      for (const userId of onceUsers) {
        values.push([fecha, 3, userId, randomTimeForTipo(fecha, 3)]);
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