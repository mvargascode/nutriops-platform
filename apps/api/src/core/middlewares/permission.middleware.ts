import type { NextFunction, Request, Response } from "express";
import { PERMISSIONS, type PermissionKey } from "@/core/auth/permissions";

export function requirePermission(permission: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const role = (user.role ?? user.rol) as string | undefined;

    if (!role) {
      return res.status(403).json({ error: "Sin rol asignado" });
    }

    const allowedRoles = PERMISSIONS[permission];

    if (!allowedRoles || !allowedRoles.includes(role as never)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción",
      });
    }

    return next();
  };
}