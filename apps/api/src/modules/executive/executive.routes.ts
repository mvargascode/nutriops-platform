import { Router } from "express";
import { executiveSummary } from "./executive.controller";

const router = Router();

// GET /executive/summary?date=YYYY-MM-DD
router.get("/summary", executiveSummary);

export default router;