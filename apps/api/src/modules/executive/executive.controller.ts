import type { Request, Response } from "express";
import { getExecutiveSummary } from "./executive.service";

export async function executiveSummary(req: Request, res: Response) {
  try {
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const data = await getExecutiveSummary(date);
    return res.json(data);
  } catch (error: any) {
    console.error("executive/summary error:", error?.message || error);
    return res.status(500).json({ error: "Error interno" });
  }
}