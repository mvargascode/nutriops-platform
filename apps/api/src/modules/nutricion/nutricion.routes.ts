import { Router } from "express";
import { requireAuth } from "@/core/middlewares/auth.middleware";
import { requirePermission } from "@/core/middlewares/permission.middleware";
import {
  getDiaria,
  getDiariaHoyController,
  getDiariaRangoController,
  getDiariaSemanaController,
  health,
  importDiariaController,
} from "./nutricion.controller";

const router = Router();

/* =========================
   RUTAS PÚBLICAS
========================= */
router.get("/health", health);
router.get("/diaria/hoy", getDiariaHoyController);
router.get("/diaria/rango", getDiariaRangoController);

/* =========================
   RUTAS PRIVADAS / ADMIN
========================= */
router.use(requireAuth);

router.get("/diaria", requirePermission("MENU_MANAGE"), getDiaria);
router.get("/diaria/semana", requirePermission("MENU_MANAGE"), getDiariaSemanaController);
router.post("/diaria/import", requirePermission("MENU_MANAGE"), importDiariaController);

export default router;