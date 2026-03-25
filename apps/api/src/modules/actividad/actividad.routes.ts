import { Router } from "express";
import { requireAuth } from "@/core/middlewares/auth.middleware";
import { getHoy, streamHoy } from "./actividad.controller";

const router = Router();

router.use(requireAuth);

router.get("/hoy", getHoy);
router.get("/hoy/stream", streamHoy);

export default router;