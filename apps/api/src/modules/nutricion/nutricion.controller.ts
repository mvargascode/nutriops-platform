import type { NextFunction, Request, Response } from "express";
import {
  getDiariaByFechaTipo,
  getDiariaHoy,
  getDiariaRango,
  getDiariaSemana,
  importDiaria,
  parseFechaYMD,
  parseTipo,
  todayCL,
} from "./nutricion.service";

export async function health(_req: Request, res: Response) {
  res.json({ ok: true });
}

export async function getDiaria(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const fecha = parseFechaYMD(req.query.fecha, "fecha");
    const tipo = parseTipo(req.query.tipo);
    const data = await getDiariaByFechaTipo(fecha, tipo);
    res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function getDiariaHoyController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tipo = parseTipo(req.query.tipo);
    const data = await getDiariaHoy(tipo);
    res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function getDiariaRangoController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const desde = parseFechaYMD(req.query.desde, "desde");
    const hasta = parseFechaYMD(req.query.hasta, "hasta");
    const data = await getDiariaRango(desde, hasta);
    res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function getDiariaSemanaController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refRaw = String(req.query.ref ?? "").trim() || todayCL();
    const ref = parseFechaYMD(refRaw, "ref");
    const data = await getDiariaSemana(ref);
    res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function importDiariaController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await importDiaria(req.body?.rows);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
}