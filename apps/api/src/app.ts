// apps/api/src/app.ts
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { AppError } from "./core/errors/AppError";
import { errorHandler } from "./core/errors/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import aforoRoutes from "./modules/aforo/aforo.routes";
import nutricionRoutes from "./modules/nutricion/nutricion.routes";
import unidadesRoutes from "./modules/unidades/routes";
import kioskRoutes from "./modules/kiosk/kiosk.routes";
import reportesRoutes from "./modules/reports/reports.routes";
import actividadRoutes from "./modules/actividad/actividad.routes";
import executiveRoutes from "./modules/executive/executive.routes";
import menuRoutes from "./modules/menu/menu.routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "API NutriOps operativa",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/aforo", aforoRoutes);
app.use("/api/nutricion", nutricionRoutes);
app.use("/api/unidades", unidadesRoutes);
app.use("/api/kiosk", kioskRoutes);
app.use("/api/reports", reportesRoutes);
app.use("/api/actividad", actividadRoutes);
app.use("/api/executive", executiveRoutes);
app.use("/api/menu", menuRoutes);

app.use((_req, _res, next) => {
  next(new AppError("Ruta no encontrada", 404, "ROUTE_NOT_FOUND"));
});

app.use(errorHandler);

export default app;