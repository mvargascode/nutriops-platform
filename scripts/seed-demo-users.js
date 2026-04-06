const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const CONFIG = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "r00t.m1lt0n",
    database: process.env.DB_NAME || "casino_nutriops",
  },
  saltRounds: 10,
};

const DEMO_UNITS = ["Administración", "Recursos Humanos", "Nutrición"];

const DEMO_USERS = [
  {
    rut: "11.111.111-1",
    nombre: "Administrador Demo",
    unidadNombre: "Administración",
    email: "admin@nutriops.local",
    username: "admin",
    rol: "Admin",
    password: "admin123",
  },
  {
    rut: "22.222.222-2",
    nombre: "Nutrición Demo",
    unidadNombre: "Nutrición",
    email: "nutri@nutriops.local",
    username: "nutri",
    rol: "Nutricion",
    password: "nutri123",
  },
  {
    rut: "33.333.333-3",
    nombre: "RRHH Demo",
    unidadNombre: "Recursos Humanos",
    email: "rrhh@nutriops.local",
    username: "rrhh",
    rol: "RRHH",
    password: "rrhh123",
  },
];

async function ensureDemoUnits(conn) {
  for (const nombre of DEMO_UNITS) {
    await conn.query(
      `
      INSERT INTO unidades (nombre)
      SELECT ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM unidades
        WHERE nombre = ?
      )
      `,
      [nombre, nombre],
    );
  }
}

async function getUnidadIdByNombre(conn, nombre) {
  const [rows] = await conn.query(
    `
    SELECT id
    FROM unidades
    WHERE nombre = ?
    LIMIT 1
    `,
    [nombre],
  );

  if (!rows.length) {
    throw new Error(`No existe la unidad "${nombre}" en la tabla unidades.`);
  }

  return rows[0].id;
}

async function deleteExistingDemoUsers(conn) {
  const usernames = DEMO_USERS.map((u) => u.username);

  await conn.query(
    `
    DELETE FROM usuarios
    WHERE username IN (?)
    `,
    [usernames],
  );
}

async function insertDemoUser(conn, user) {
  const unidadId = await getUnidadIdByNombre(conn, user.unidadNombre);
  const passwordHash = await bcrypt.hash(user.password, CONFIG.saltRounds);

  await conn.query(
    `
    INSERT INTO usuarios (
      rut,
      nombre,
      unidad_id,
      email,
      username,
      rol,
      is_active,
      password_hash
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `,
    [
      user.rut,
      user.nombre,
      unidadId,
      user.email,
      user.username,
      user.rol,
      passwordHash,
    ],
  );
}

async function main() {
  const conn = await mysql.createConnection(CONFIG.db);

  try {
    console.log("Verificando unidades demo...");
    await ensureDemoUnits(conn);

    console.log("Eliminando usuarios demo anteriores...");
    await deleteExistingDemoUsers(conn);

    console.log("Insertando usuarios demo...");
    for (const user of DEMO_USERS) {
      await insertDemoUser(conn, user);
      console.log(`Usuario creado: ${user.username} (${user.rol})`);
    }

    console.log("\nUsuarios demo creados correctamente:");
    for (const user of DEMO_USERS) {
      console.log(`- ${user.username} / ${user.password}`);
    }
  } catch (error) {
    console.error("Error en seed-demo-users:", error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
