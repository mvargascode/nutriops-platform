import { Router } from "express";
import { getConsumoReport } from "./reports.controller";

const router = Router();

router.get("/consumo", getConsumoReport);

export default router;
