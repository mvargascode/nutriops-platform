import {
  findDiariaByFechaTipo,
  findDiariaRango,
  importNutricionRows,
} from "./nutricion.repository";
import type {
  NutriRow,
  NutricionDiariaResponse,
  NutricionRangoResponse,
  NutricionSemanaResponse,
  NutricionTipo,
  ValidateRowResult,
} from "./nutricion.types";

function isYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function cleanString(v: unknown, max: number) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;

  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  if (typeof v === "string") {
    const normalized = v.trim().replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export function parseTipo(value: unknown): NutricionTipo {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  throw new Error("tipo inválido (1/2/3)");
}

export function parseFechaYMD(value: unknown, fieldName = "fecha"): string {
  const fecha = String(value ?? "").trim();
  if (!isYMD(fecha)) throw new Error(`${fieldName} inválido (YYYY-MM-DD)`);
  return fecha;
}

export function todayCL(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;

  return `${y}-${m}-${d}`;
}

export function validateRow(r: unknown, index: number): ValidateRowResult {
  const row = r as Record<string, unknown>;

  const fecha = cleanString(row.fecha, 10);
  if (!isYMD(fecha)) return { ok: false, error: `Fila ${index + 1}: fecha inválida (YYYY-MM-DD)` };

  const tipo = Number(row.tipo);
  if (![1, 2, 3].includes(tipo)) return { ok: false, error: `Fila ${index + 1}: tipo inválido (1/2/3)` };

  const orden = Number(row.orden);
  if (![1, 2, 3, 4].includes(orden)) return { ok: false, error: `Fila ${index + 1}: orden inválido (1..4)` };

  const item = cleanString(row.item, 255);
  if (!item) return { ok: false, error: `Fila ${index + 1}: item requerido` };

  const porcion = cleanString(row.porcion, 100);
  if (!porcion) return { ok: false, error: `Fila ${index + 1}: porcion requerida` };

  const kcal = toNumberOrNull(row.kcal);
  const proteinas_g = toNumberOrNull(row.proteinas_g);
  const grasas_g = toNumberOrNull(row.grasas_g);
  const carbohidratos_g = toNumberOrNull(row.carbohidratos_g);

  const comentarioRaw = row.comentario ?? row.Comentario ?? row.COMENTARIO ?? null;
  const comentario = comentarioRaw ? cleanString(comentarioRaw, 500) : null;

  for (const [name, val] of [
    ["kcal", kcal],
    ["proteinas_g", proteinas_g],
    ["grasas_g", grasas_g],
    ["carbohidratos_g", carbohidratos_g],
  ] as const) {
    if (val !== null && val < 0) {
      return { ok: false, error: `Fila ${index + 1}: ${name} no puede ser negativo` };
    }
  }

  return {
    ok: true,
    row: {
      fecha,
      tipo: tipo as 1 | 2 | 3,
      orden: orden as 1 | 2 | 3 | 4,
      item,
      porcion,
      kcal,
      proteinas_g,
      grasas_g,
      carbohidratos_g,
      comentario,
    },
  };
}

export async function getDiariaByFechaTipo(
  fecha: string,
  tipo: NutricionTipo,
): Promise<NutricionDiariaResponse> {
  const items = await findDiariaByFechaTipo(fecha, tipo);
  return { fecha, tipo, items };
}

export async function getDiariaHoy(
  tipo: NutricionTipo,
): Promise<NutricionDiariaResponse> {
  const fecha = todayCL();
  const items = await findDiariaByFechaTipo(fecha, tipo);
  return { fecha, tipo, items };
}

export async function getDiariaRango(
  desde: string,
  hasta: string,
): Promise<NutricionRangoResponse> {
  const rows = await findDiariaRango(desde, hasta);
  return { desde, hasta, rows };
}

export async function getDiariaSemana(
  ref: string,
): Promise<NutricionSemanaResponse> {
  const [yy, mm, dd] = ref.split("-").map(Number);
  const base = new Date(yy, (mm ?? 1) - 1, dd ?? 1);

  const dow = base.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;

  const lunes = new Date(base);
  lunes.setDate(base.getDate() + diff);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  };

  const desde = fmt(lunes);
  const hasta = fmt(domingo);
  const rows = await findDiariaRango(desde, hasta);

  return { ref, desde, hasta, rows };
}

export async function importDiaria(
  rowsIn: unknown,
) {
  if (!Array.isArray(rowsIn) || rowsIn.length === 0) {
    throw new Error("Payload inválido: { rows: [...] } requerido");
  }

  const cleaned: NutriRow[] = [];
  for (let i = 0; i < rowsIn.length; i++) {
    const v = validateRow(rowsIn[i], i);
    if (!v.ok) throw new Error(v.error);
    cleaned.push(v.row);
  }

  const result = await importNutricionRows(cleaned);

  return {
    success: true,
    ...result,
  };
}