import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

type Validator<T> = (data: unknown) => T;

export function validateBody<T>(validator: Validator<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = validator(req.body);
      next();
    } catch (error) {
      next(
        new AppError(
          "Datos de entrada inválidos",
          400,
          "VALIDATION_ERROR",
          error instanceof Error ? error.message : error,
        ),
      );
    }
  };
}
