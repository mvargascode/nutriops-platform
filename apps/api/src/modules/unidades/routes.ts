import { Router, Request, Response } from "express";
import { pool } from "../../core/db/connection"; // ajusta si tu db está en otro path

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre FROM unidades ORDER BY nombre ASC",
    );

    res.json({ rows });
  } catch (error) {
    console.error("[UNIDADES]", error);
    res.status(500).json({ error: "Error al obtener unidades" });
  }
});

export default router;
