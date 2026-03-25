import type { Request, Response } from "express";
import { z } from "zod";
import { buildConsumoReport } from "./reports.service";

const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z
    .union([z.literal("all"), z.literal("1"), z.literal("2"), z.literal("3")])
    .default("all"),
});

export async function getConsumoReport(req: Request, res: Response) {
  try {
    const parsed = reportQuerySchema.safeParse({
      from: req.query.from,
      to: req.query.to,
      tipo: req.query.tipo ?? "all",
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Parámetros inválidos",
        errors: parsed.error.flatten(),
      });
    }

    const { from, to, tipo } = parsed.data;
    const tipoParsed = tipo === "all" ? "all" : (Number(tipo) as 1 | 2 | 3);

    const report = await buildConsumoReport({
      from,
      to,
      tipo: tipoParsed,
    });

    return res.json(report);
  } catch (error) {
    console.error("[reports] getConsumoReport error:", error);
    return res.status(500).json({
      message: "Error interno generando reporte.",
    });
  }
}
