import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT no configurado" });
  }

  try {
    const payload = jwt.verify(token, secret) as {
      sub?: number;
      id?: number;
      role?: string;
      email?: string;
    };

    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}
