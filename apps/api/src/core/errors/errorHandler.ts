import type { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // AppError expone el código HTTP en `statusCode` (no `status`) - leer la
  // propiedad equivocada hacía que CUALQUIER AppError (401, 404, etc.)
  // terminara respondiendo 500 en vez de su status real.
  const status = Number(err?.statusCode ?? err?.status) || 500;

  console.error("ERROR HANDLER =>", {
    message: err?.message,
    status: err?.status,
    stack: err?.stack,
  });

  res.status(status).json({
    ok: false,
    error: {
      code: status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
      message: err?.message || "Error interno del servidor",
      details: null,
    },
  });
}
