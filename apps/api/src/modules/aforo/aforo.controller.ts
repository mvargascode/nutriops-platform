import type { NextFunction, Request, Response } from "express";
import {
  buildOcupacionStreamPayload,
  getAforoActualService,
  getAforoHoyService,
  getDebugOcupacionService,
  getOcupacionService,
  getUltimaSemanaService,
  parseOcupacionParams,
  parseTipo,
} from "./aforo.service";

export async function getActual(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getAforoActualService();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getHoy(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = parseTipo(req.query.tipo);
    const data = await getAforoHoyService(tipo);
    res.json(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes("tipo")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function getOcupacion(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const params = parseOcupacionParams(req.query);
    const data = await getOcupacionService(params);
    res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
}

export async function getDebugOcupacionController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getDebugOcupacionService();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function streamOcupacion(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const params = parseOcupacionParams(req.query);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
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

    async function push(iv?: NodeJS.Timeout) {
      if (closed) return;

      try {
        const { payload, fp } = await buildOcupacionStreamPayload(params);

        if (fp === lastFp) {
          res.write(`: ping\n\n`);
          return;
        }

        lastFp = fp;
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        console.error("[aforo.stream] push error:", error);

        if (!closed) {
          try {
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ message: "stream error" })}\n\n`);
          } catch {}
        }

        if (iv) closeAll(iv);
      }
    }

    await push();
    const iv = setInterval(() => void push(iv), 3000);

    req.on("close", () => closeAll(iv));
    req.on("end", () => closeAll(iv));
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

export async function getUltimaSemana(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getUltimaSemanaService();
    res.json(data);
  } catch (error) {
    next(error);
  }
}
