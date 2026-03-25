import { Request, Response } from "express";
import {
  deleteMenuById,
  getMenuById,
  listMenu,
  updateMenuById,
} from "./menu.repository";

export async function getMenuController(req: Request, res: Response) {
  try {
    const { fecha, tipo, desde, hasta } = req.query;

    const rows = await listMenu({
      fecha: typeof fecha === "string" ? fecha : undefined,
      tipo: typeof tipo === "string" ? tipo : undefined,
      desde: typeof desde === "string" ? desde : undefined,
      hasta: typeof hasta === "string" ? hasta : undefined,
    });

    return res.json(rows);
  } catch (error) {
    console.error("getMenuController error:", error);
    return res.status(500).json({ message: "Error al obtener menú" });
  }
}

export async function patchMenuController(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const existing = await getMenuById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    const ok = await updateMenuById(id, req.body);
    if (!ok) {
      return res.status(400).json({ message: "No se enviaron campos para actualizar" });
    }

    const updated = await getMenuById(id);
    return res.json({
      message: "Registro actualizado correctamente",
      data: updated,
    });
  } catch (error) {
    console.error("patchMenuController error:", error);
    return res.status(500).json({ message: "Error al actualizar registro" });
  }
}

export async function deleteMenuController(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const existing = await getMenuById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    const ok = await deleteMenuById(id);

    if (!ok) {
      return res.status(500).json({ message: "No se pudo eliminar el registro" });
    }

    return res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("deleteMenuController error:", error);
    return res.status(500).json({ message: "Error al eliminar registro" });
  }
}