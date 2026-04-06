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

async function getActiveUsers(conn) {
  const [rows] = await conn.query(`
    SELECT id
    FROM usuarios
    WHERE is_active = 1
    ORDER BY id ASC
  `);

  return rows.map((r) => r.id);
}

async function main() {
  const conn = await mysql.createConnection(CONFIG.db);

  try {
    const fecha = formatDateChile();
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

    const desayunoUsers = shuffle(userIds).slice(0, desayunoCount);
    const almuerzoUsers = shuffle(userIds).slice(0, almuerzoCount);

    await conn.query(
      `
      DELETE FROM consumos
      WHERE fecha = ? AND tipo IN (1, 2)
      `,
      [fecha],
    );

    const values = [
      ...desayunoUsers.map((userId) => [
        fecha,
        1,
        userId,
        randomTimeForTipo(fecha, 1),
      ]),
      ...almuerzoUsers.map((userId) => [
        fecha,
        2,
        userId,
        randomTimeForTipo(fecha, 2),
      ]),
    ];

    if (values.length) {
      await conn.query(
        `
        INSERT INTO consumos (fecha, tipo, usuario_id, created_at)
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