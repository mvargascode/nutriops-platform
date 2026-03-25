export type NutricionTipo = 1 | 2 | 3;
export type NutricionOrden = 1 | 2 | 3 | 4;

export type NutriRow = {
  fecha: string;
  tipo: NutricionTipo;
  orden: NutricionOrden;
  item: string;
  porcion: string;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario: string | null;
};

export type NutricionItemRow = NutriRow & {
  id?: number;
};

export type NutricionDiariaResponse = {
  fecha: string;
  tipo: NutricionTipo;
  items: NutricionItemRow[];
};

export type NutricionRangoResponse = {
  desde: string;
  hasta: string;
  rows: NutricionItemRow[];
};

export type NutricionSemanaResponse = {
  ref: string;
  desde: string;
  hasta: string;
  rows: NutricionItemRow[];
};

export type NutricionImportResponse = {
  success: boolean;
  rowsReceived: number;
  chunks: number;
  affectedRows: number;
};

export type ValidateRowResult =
  | { ok: true; row: NutriRow }
  | { ok: false; error: string };