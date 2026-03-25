import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { findUserById, findUserByLogin } from "./auth.repository";

function signToken(user: { id: number; rol: string; email: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err: any = new Error("JWT no configurado");
    err.status = 500;
    throw err;
  }

  const jwtSecret: Secret = secret;
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      sub: user.id,
      role: user.rol,
      email: user.email,
    },
    jwtSecret,
    options,
  );
}

export async function loginUser(body: { login?: string; password?: string }) {
  const { login, password } = body || {};

  if (!login || !password) {
    const err: any = new Error("Faltan credenciales");
    err.status = 400;
    throw err;
  }

  const user = await findUserByLogin(login);

  if (!user) {
    const err: any = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }

  if (!user.is_active) {
    const err: any = new Error("Usuario inactivo");
    err.status = 401;
    throw err;
  }

if (!user.password_hash) {
  const err: any = new Error("Este usuario no tiene acceso al sistema");
  err.status = 403;
  throw err;
}

  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    const err: any = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.nombre,
      email: user.email,
      username: user.username,
      role: user.rol,
    },
  };
}

export async function getCurrentUser(userId?: number) {
  if (!userId) {
    const err: any = new Error("Token inválido");
    err.status = 401;
    throw err;
  }

  const user = await findUserById(userId);

  if (!user) {
    const err: any = new Error("Usuario no existe");
    err.status = 401;
    throw err;
  }

  if (!user.is_active) {
    const err: any = new Error("Usuario inactivo");
    err.status = 401;
    throw err;
  }

  return {
    user: {
      id: user.id,
      name: user.nombre,
      email: user.email,
      username: user.username,
      role: user.rol,
    },
  };
}
