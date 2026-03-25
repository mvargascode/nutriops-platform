import { Router } from "express";
import { loginHandler, meHandler } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.post("/login", loginHandler);
router.get("/me", requireAuth, meHandler);

export default router;
