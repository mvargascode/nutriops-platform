import type { NextFunction, Request, Response } from "express";
import * as service from "./users.service";

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const q = String(req.query.q ?? "").trim();

    const unidad_id_raw = Number(req.query.unidad_id);
    const unidad_id =
      req.query.unidad_id !== undefined && !Number.isNaN(unidad_id_raw)
        ? unidad_id_raw
        : null;

    const limit_raw = Number(req.query.limit);
    const offset_raw = Number(req.query.offset);

    const limit =
      !Number.isNaN(limit_raw) && limit_raw > 0
        ? Math.min(limit_raw, 200)
        : 50;

    const offset =
      !Number.isNaN(offset_raw) && offset_raw >= 0
        ? offset_raw
        : 0;

    const rawStatus = String(req.query.status ?? "active").trim().toLowerCase();
    const status =
      rawStatus === "inactive" || rawStatus === "all" ? rawStatus : "active";

    const result = await service.listUsers({
      q,
      unidad_id,
      status,
      limit,
      offset,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    const result = await service.getUserById(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await service.createUser(req.body);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    const result = await service.updateUser(id, req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    const result = await service.updateUserStatus(id, req.body);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function hardDeleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Number(req.params.id);
    const result = await service.hardDeleteUser(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
}