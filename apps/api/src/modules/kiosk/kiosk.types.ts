export type KioskIssueRequest = {
  rut: string;
};

export type UsuarioDB = {
  id: number;
  rut: string;
  nombre: string;
  unidad_id: number;
  is_active: number;
};

export type KioskIssueResponse =
  | {
      ok: true;
      tipo: 1 | 2 | 3;
      tipoLabel: string;
      usuario: {
        id: number;
        nombre: string;
        rut: string;
      };
      fecha: string;
      hora: string;
    }
  | {
      ok: false;
      message: string;
    };
