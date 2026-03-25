import { Request, Response } from "express";
import { emitirTicket } from "./kiosk.service";

export async function issueTicket(req: Request, res: Response) {
  try {
    const { rut } = req.body;

    if (!rut) {
      return res.status(400).json({ ok: false, message: "RUT requerido" });
    }

    const result = await emitirTicket(rut);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("[kiosk] error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
}
