const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type KioskIssueOk = {
  ok: true;
  tipo: 1 | 2 | 3;
  tipoLabel: string;
  usuario: { id: number; nombre: string; rut: string };
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm
};

export type KioskIssueErr = { ok: false; message: string };

export async function issueTicket(rut: string): Promise<KioskIssueOk | KioskIssueErr> {
  const res = await fetch(`${API_BASE}/api/kiosk/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rut }),
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      return { ok: false, message: j?.message ?? `HTTP ${res.status}` };
    } catch {
      return { ok: false, message: `HTTP ${res.status}: ${text}` };
    }
  }

  return await res.json();
}