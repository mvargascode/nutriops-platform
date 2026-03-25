import bcrypt from "bcryptjs";
import * as repo from "./users.repository";
import type {
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
} from "./users.types";

function roleRequiresAccess(rol?: string | null) {
  return rol === "Admin" || rol === "Nutricion" || rol === "RRHH";
}

export async function listUsers(params: ListUsersParams) {
  return repo.findUsers(params);
}

export async function getUserById(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    const err: any = new Error("ID de usuario inválido");
    err.status = 400;
    throw err;
  }

  const user = await repo.findUserById(id);

  if (!user) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  return user;
}

export async function createUser(data: CreateUserInput) {
  const {
    rut,
    nombre,
    unidad = null,
    email = null,
    username = null,
    rol = "User",
    password,
  } = data;

  const cleanRut = rut?.trim() || "";
  const cleanNombre = nombre?.trim() || "";
  const cleanEmail = email?.trim() || null;
  const cleanUsername = username?.trim() || null;
  const cleanPassword = password?.trim() || "";
  const requiresAccess = roleRequiresAccess(rol);

  if (!cleanRut || !cleanNombre) {
    const err: any = new Error("RUT y nombre son obligatorios");
    err.status = 400;
    throw err;
  }

  if (requiresAccess && !cleanUsername) {
    const err: any = new Error("El username es obligatorio para usuarios con acceso");
    err.status = 400;
    throw err;
  }

  if (requiresAccess && !cleanPassword) {
    const err: any = new Error("La contraseña es obligatoria para usuarios con acceso");
    err.status = 400;
    throw err;
  }

  const duplicates = await repo.findDuplicateUser(
    cleanRut,
    cleanEmail,
    cleanUsername,
  );

  if (duplicates.length > 0) {
    const err: any = new Error("Ya existe un usuario con ese RUT, email o username");
    err.status = 409;
    throw err;
  }

  let passwordHash: string | null = null;

  if (requiresAccess) {
    passwordHash = await bcrypt.hash(cleanPassword, 10);
  }

  await repo.insertUser(
    {
      rut: cleanRut,
      nombre: cleanNombre,
      unidad,
      email: cleanEmail,
      username: requiresAccess ? cleanUsername : null,
      rol,
    },
    passwordHash,
  );

  return {
    message: "Usuario creado correctamente",
  };
}

export async function updateUser(id: number, data: UpdateUserInput) {
  if (!Number.isInteger(id) || id <= 0) {
    const err: any = new Error("ID de usuario inválido");
    err.status = 400;
    throw err;
  }

  const existing = await repo.findUserById(id);

  if (!existing) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const nextRole = data.rol ?? existing.rol;
  const requiresAccess = roleRequiresAccess(nextRole);

  const email = typeof data.email === "string" ? data.email.trim() : data.email;
  let username =
    typeof data.username === "string" ? data.username.trim() : data.username;

  if (!requiresAccess) {
    username = null;
  }

  const duplicates = await repo.findDuplicateUserExcludingId(
    id,
    email ?? null,
    username ?? null,
  );

  if (duplicates.length > 0) {
    const err: any = new Error("El email o username ya está en uso");
    err.status = 409;
    throw err;
  }

  if (requiresAccess && typeof username !== "string") {
    const err: any = new Error("El username es obligatorio para usuarios con acceso");
    err.status = 400;
    throw err;
  }

  let passwordHash: string | null | undefined = undefined;

  if (typeof data.password === "string" && data.password.trim()) {
    passwordHash = await bcrypt.hash(data.password.trim(), 10);
  }

  if (!requiresAccess) {
    passwordHash = null;
  }

  const updated = await repo.updateUserById(
    id,
    {
      ...data,
      email,
      username,
    },
    passwordHash,
  );

  if (!updated) {
    const err: any = new Error("No se realizaron cambios en el usuario");
    err.status = 400;
    throw err;
  }

  return {
    message: "Usuario actualizado correctamente",
  };
}

export async function updateUserStatus(
  id: number,
  body: { is_active?: number },
) {
  if (!Number.isInteger(id) || id <= 0) {
    const err: any = new Error("ID de usuario inválido");
    err.status = 400;
    throw err;
  }

  if (body.is_active !== 0 && body.is_active !== 1) {
    const err: any = new Error("El campo is_active debe ser 0 o 1");
    err.status = 400;
    throw err;
  }

  const existing = await repo.findUserById(id);

  if (!existing) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const updated = await repo.setUserActiveStatus(id, body.is_active);

  if (!updated) {
    const err: any = new Error("No se pudo actualizar el estado del usuario");
    err.status = 400;
    throw err;
  }

  return {
    message:
      body.is_active === 1
        ? "Usuario activado correctamente"
        : "Usuario desactivado correctamente",
  };
}

export async function hardDeleteUser(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    const err: any = new Error("ID de usuario inválido");
    err.status = 400;
    throw err;
  }

  const existing = await repo.findUserById(id);

  if (!existing) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }

  const deleted = await repo.deleteUserById(id);

  if (!deleted) {
    const err: any = new Error("No se pudo eliminar el usuario");
    err.status = 400;
    throw err;
  }

  return {
    message: "Usuario eliminado correctamente",
  };
}