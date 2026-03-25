import type { Request, Response } from "express";
import { loginUser, getCurrentUser } from "./auth.service";

export async function loginHandler(req: Request, res: Response) {
  try {
    const result = await loginUser(req.body);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.status || 500).json({
      error: error.message || "Error interno",
    });
  }
}

export async function meHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.sub ?? (req as any).user?.id;
    const result = await getCurrentUser(userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.status || 500).json({
      error: error.message || "Error interno",
    });
  }
}