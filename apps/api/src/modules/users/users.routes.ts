import { Router } from "express";
import * as controller from "./users.controller";
import { requireAuth } from "@/core/middlewares/auth.middleware";
import { requirePermission } from "@/core/middlewares/permission.middleware";
import { requireRole } from "@/core/middlewares/role.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("USERS_MANAGE"), controller.listUsers);
router.get("/:id", requirePermission("USERS_MANAGE"), controller.getUserById);
router.post("/", requirePermission("USERS_MANAGE"), controller.createUser);
router.patch("/:id", requirePermission("USERS_MANAGE"), controller.updateUser);

router.patch(
  "/:id/status",
  requirePermission("USERS_MANAGE"),
  controller.updateUserStatus,
);

router.delete("/:id", requireRole("Admin"), controller.hardDeleteUser);

export default router;