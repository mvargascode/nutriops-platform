import type { Request, Response, NextFunction } from "express";
import {
  buildActividadHoyStreamPayload,
  getActividadHoy,
} from "./actividad.service";

export async function getHoy(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getActividadHoy();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function streamHoy(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const everyMs = Math.max(
      2000,
      Math.min(30000, Number(req.query.everyMs ?? 5000)),
    );

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // @ts-ignore
    res.flushHeaders?.();

    res.write(`retry: 3000\n\n`);

    let closed = false;
    let lastFp = "";

    const closeAll = (iv: NodeJS.Timeout) => {
      if (closed) return;
      closed = true;
      clearInterval(iv);
      try {
        res.end();
      } catch {}
    };

    async function push() {
      if (closed) return;

      const { payload, fp } = await buildActividadHoyStreamPayload();

      if (fp === lastFp) {
        res.write(`: ping\n\n`);
        return;
      }

      lastFp = fp;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }

    await push();
    const iv = setInterval(() => void push(), everyMs);

    req.on("close", () => closeAll(iv));
  } catch (error) {
    next(error);
  }
}
