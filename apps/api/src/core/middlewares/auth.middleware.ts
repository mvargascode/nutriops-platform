import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { env } from "../config/env";

type JwtPayload = {
  id: number;
  username: string;
  role: string;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
    token?: string;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Token no proporcionado", 401, "AUTH_TOKEN_MISSING");
    }

    console.log("[requireAuth] ejecutándose");
    console.log("[requireAuth] authorization:", req.headers.authorization);

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError(
        "Formato de token inválido",
        401,
        "AUTH_TOKEN_INVALID",
      );
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      new AppError("Token inválido o expirado", 401, "AUTH_TOKEN_EXPIRED"),
    );
  }
}
