import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "@/core/middlewares/auth.middleware";
import { getHoy, streamHoy } from "./actividad.controller";

const router = Router();

// EventSource (usado para /hoy/stream desde el frontend) no puede enviar
// headers personalizados, así que el navegador no puede mandar el
// Authorization: Bearer <token> ahí. Como fallback SOLO para esta ruta,
// se acepta el token también por query string y se copia al header antes
// de pasar por requireAuth, que sigue validando el JWT exactamente igual
// que siempre (firma, expiración, etc.) sin cambios en su comportamiento
// para el resto de la API.
function allowSseTokenFromQuery(req: Request, _res: Response, next: NextFunction) {
  if (!req.headers.authorization && typeof req.query.token === "string" && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}

router.get("/hoy", requireAuth, getHoy);
router.get("/hoy/stream", allowSseTokenFromQuery, requireAuth, streamHoy);

export default router;