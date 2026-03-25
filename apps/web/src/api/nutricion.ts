import { http } from "./http";

export interface NutricionItem {
  id?: number;
  fecha: string;
  tipo: number;
  orden: number;
  item: string;
  porcion?: string | null;
  kcal: number | null;
  proteinas_g?: number | null;
  grasas_g?: number | null;
  carbohidratos_g?: number | null;
  comentario?: string | null;
}

/** IMPORTANTE: Mantén el mismo prefijo que ya te funciona ("/nutricion/...") */
export async function obtenerNutricionHoy(tipo: 1 | 2 | 3) {
  const { data } = await http.get("/nutricion/diaria/hoy", {
    params: { tipo },
  });

  return data as {
    fecha: string;
    tipo: 1 | 2 | 3;
    items: NutricionItem[];
  };
}

export async function obtenerNutricionPorFecha(fecha: string, tipo: 1 | 2 | 3) {
  const { data } = await http.get("/nutricion/diaria", {
    params: { fecha, tipo },
  });

  return data as {
    fecha: string;
    tipo: 1 | 2 | 3;
    items: NutricionItem[];
  };
}

export async function obtenerNutricionSemana(desde: string, hasta: string) {
  const { data } = await http.get("/nutricion/diaria/rango", {
    params: { desde, hasta },
  });

  return data as {
    desde: string;
    hasta: string;
    rows: NutricionItem[];
  };
}

export type NutriRow = {
  fecha: string;
  tipo: 1 | 2 | 3;
  orden: 1 | 2 | 3 | 4;
  item: string;
  porcion: string;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario?: string | null;
};

export async function importNutricionDiaria(rows: NutriRow[]) {
  const { data } = await http.post("/nutricion/diaria/import", { rows });
  return data as {
    success: boolean;
    rowsReceived: number;
    chunks: number;
    affectedRows: number;
  };
}
