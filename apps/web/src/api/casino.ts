import { http } from "./http";

export type TipoComida = 1 | 2 | 3; //1=Desayuno 2=Almuerzo 3=Cena


export async function getAforoActual(): Promise<{ aforo_total: number }> {
    const { data } = await http.get('/aforo/actual');
    return data;
}

export async function getAforoHoy(tipo?: TipoComida): Promise<
| { fecha: string; tipo: TipoComida; cantidad: number }
| { fecha: string; detalle: { tipo: TipoComida; cantidad: number }[]; total: number }
> {
    const { data } = await http.get('/aforo/hoy', { params: { tipo } });
    return data;
}

export type NutricionItem = {
    item: string;
    porcion: string;
    kcal: number;
    proteinas_g: number;
    grasas_g: number;
    carbohidratos_g: number;
};

export async function getNutricionHoy(tipo: TipoComida): Promise<{
    fecha: string; tipo: TipoComida; items: NutricionItem[];
}> {
    const {data} = await http.get("/nutricion/hoy", { params: { tipo } });
    return data;
}

export async function getOcupacion(tipo: TipoComida, ventanaMin = 30, turno?: number) {
    const { data } = await http.get('/aforo/ocupacion', { params: {tipo, ventanaMin, turno } });
    return data as { tipo: TipoComida; turno?: number; ventanaMin: number; ocupacion: number; capacidad: number; porcentaje: number; serverTime: string };
}