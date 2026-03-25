export function sanitizeRutInput(raw: string) {
  const up = raw.toUpperCase();
  const cleaned = up.replace(/[^0-9K]/g, ""); // solo 0-9 y K

  const body = cleaned.replace(/K/g, ""); // por si escriben K en medio
  const bodyTrimmed = body.slice(0, 9); // 👈 máximo 9 dígitos

  // DV: el último caracter si es número o K y si ya hay body
  const lastChar = cleaned.slice(-1);
  const dv = /[0-9K]/.test(lastChar) && bodyTrimmed.length > 0 ? lastChar : "";

  return { body: bodyTrimmed, dv };
}

export function formatRut(body: string, dv: string) {
  if (!body) return "";
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv ? `${withDots}-${dv}` : withDots;
}