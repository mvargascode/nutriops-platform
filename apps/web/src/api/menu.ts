import { http } from "@/api/http";

export type MenuRow = {
  id: number;
  fecha: string;
  tipo: number;
  orden: number;
  item: string;
  porcion: string | null;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario: string | null;
};

export type GetMenuParams = {
  fecha?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
};

export type UpdateMenuPayload = Partial<{
  fecha: string;
  tipo: number;
  orden: number;
  item: string;
  porcion: string | null;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario: string | null;
}>;

export async function getMenu(params?: GetMenuParams): Promise<MenuRow[]> {
  const response = await http.get("/menu", { params });
  return response.data;
}

export async function updateMenu(
  id: number,
  payload: UpdateMenuPayload
) {
  const response = await http.patch(`/menu/${id}`, payload);
  return response.data;
}

export async function deleteMenu(id: number) {
  const response = await http.delete(`/menu/${id}`);
  return response.data;
}