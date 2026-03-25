import type { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = Number(err?.status) || 500;

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
