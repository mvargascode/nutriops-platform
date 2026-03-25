import type { NextFunction, Request, Response } from "express";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const role = user.role ?? user.rol;

    if (!role) {
      return res.status(403).json({ error: "Sin rol asignado" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción",
      });
    }

    return next();
  };
}