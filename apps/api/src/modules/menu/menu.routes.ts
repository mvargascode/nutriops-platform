import { Router } from "express";
import { requireAuth } from "@/core/middlewares/auth.middleware";
import { requirePermission } from "@/core/middlewares/permission.middleware";
import {
  deleteMenuController,
  getMenuController,
  patchMenuController,
} from "./menu.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("MENU_MANAGE"), getMenuController);
router.patch("/:id", requirePermission("MENU_MANAGE"), patchMenuController);
router.delete("/:id", requirePermission("MENU_MANAGE"), deleteMenuController);

export default router;