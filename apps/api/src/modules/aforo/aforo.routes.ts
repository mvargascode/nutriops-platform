import { Router } from "express";
import {
  getActual,
  getDebugOcupacionController,
  getHoy,
  getOcupacion,
  getUltimaSemana,
  streamOcupacion,
} from "./aforo.controller";

const router = Router();

router.get("/actual", getActual);
router.get("/hoy", getHoy);
router.get("/ocupacion", getOcupacion);
router.get("/_debug_ocu", getDebugOcupacionController);
router.get("/ocupacion/stream", streamOcupacion);
router.get("/ultima-semana", getUltimaSemana);

export default router;