<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import type { TipoComida } from "@/api/casino";
import { http } from "@/api/http";
import { useSseStore } from "@/stores/sse";

/* =========================
   DTOs
========================= */
type ActividadHoyDTO = {
  fecha: string;
  total: number;
  desayuno: number;
  almuerzo: number;
  once: number;

  ayerHastaAhora: {
    total: number;
    desayuno?: number;
    almuerzo?: number;
    once?: number;
  };
  comparacion: { delta: number; pct: number | null };

  porHora: { hora: number; cantidad: number }[];
  serverTime?: string;
};

type OcupacionDTO = {
  tipo: number;
  turno: number | null;
  ventanaMin: number;
  ocupacion: number;
  capacidad: number;
  porcentaje: number; // 0..100
  serverTime?: string;
};

type SemanaDia = {
  fecha: string; // YYYY-MM-DD
  desayuno: number;
  almuerzo: number;
  once: number;
  total: number;
};

type UltimaSemanaDTO = {
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  dias: SemanaDia[];
  totales: { desayuno: number; almuerzo: number; once: number; total: number };
  serverTime?: string;
};

const sse = useSseStore();

/* =========================
   Hora Chile + tipo actual
========================= */
const horaCL = ref<number>(0);
let tHora: number | undefined;

function tickHora() {
  horaCL.value = Number(
    new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
}

const tipoActual = computed<TipoComida>(() => {
  const h = horaCL.value;

  if (h >= 6 && h < 10) return 1; // desayuno
  if (h >= 10 && h < 16) return 2; // almuerzo
  if (h >= 16 && h < 21) return 3; // once

  // fuera de horario, deja almuerzo por defecto
  return 2;
});

function ventanaPorTipo(tipo: TipoComida) {
  if (tipo === 1) return 25; // desayuno
  if (tipo === 2) return 60; // almuerzo
  return 30; // once
}

function buildOcupacionUrl() {
  const tipo = tipoActual.value;
  const ventanaMin = ventanaPorTipo(tipo);
  return `/aforo/ocupacion?tipo=${tipo}&ventanaMin=${ventanaMin}`;
}

function buildOcupacionSseUrl() {
  const tipo = tipoActual.value;
  const ventanaMin = ventanaPorTipo(tipo);
  return `/api/aforo/ocupacion/stream?tipo=${tipo}&ventanaMin=${ventanaMin}`;
}

/* =========================
   Estado general
========================= */
const loadingActividad = ref(false);
const errorActividad = ref<string | null>(null);
const actividad = ref<ActividadHoyDTO | null>(null);

const loadingOcu = ref(false);
const errorOcu = ref<string | null>(null);
const ocupacion = ref<OcupacionDTO | null>(null);

const loadingSemana = ref(false);
const errorSemana = ref<string | null>(null);
const semana = ref<UltimaSemanaDTO | null>(null);

/* bump total */
const bumpTotal = ref(false);
const prevTotal = ref<number>(0);

/* tooltips */
const tipHora = ref<{ x: number; y: number; text: string } | null>(null);
const tipSemana = ref<{ x: number; y: number; text: string } | null>(null);

/* selección día (semana) */
const selectedFecha = ref<string>(""); // YYYY-MM-DD

/* =========================
   Helpers de fecha/hora
========================= */
function formatIsoCL(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function ymdToShortDM(fecha: string) {
  // "YYYY-MM-DD" -> "DD-MM"
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return fecha;
  return `${d}-${m}`;
}

/* =========================
   Card 1: Consumos por hora (Actividad hoy)
========================= */
type BandKey = "desayuno" | "almuerzo" | "once";
const BANDS: { key: BandKey; label: string; start: number; end: number }[] = [
  { key: "desayuno", label: "Desayuno", start: 7, end: 10 },
  { key: "almuerzo", label: "Almuerzo", start: 11, end: 15 },
  { key: "once", label: "Once", start: 16, end: 20 },
];

const minHour = computed(() => {
  const base = Math.min(...BANDS.map((b) => b.start));
  const horas = actividad.value?.porHora?.map((x) => x.hora) ?? [];
  return horas.length ? Math.min(base, Math.min(...horas)) : base;
});
const maxHour = computed(() => {
  const base = Math.max(...BANDS.map((b) => b.end));
  const horas = actividad.value?.porHora?.map((x) => x.hora) ?? [];
  return horas.length ? Math.max(base, Math.max(...horas)) : base;
});

const seriesHora = computed(() => {
  const from = minHour.value;
  const to = maxHour.value;
  const map = new Map<number, number>();
  (actividad.value?.porHora ?? []).forEach((p) => map.set(p.hora, p.cantidad));

  const out: { hora: number; cantidad: number }[] = [];
  for (let h = from; h <= to; h++)
    out.push({ hora: h, cantidad: map.get(h) ?? 0 });
  return out;
});

const maxCountHora = computed(() =>
  Math.max(0, ...seriesHora.value.map((x) => x.cantidad)),
);

const yTicksHora = computed(() => {
  const maxV = maxCountHora.value;
  const mid = maxV ? Math.ceil(maxV / 2) : 0;
  return { max: maxV, mid, min: 0 };
});

// ✅ CLAVE: altura en % para que SIEMPRE calce con las líneas
const barHeightPctHora = (v: number) => {
  const maxV = maxCountHora.value || 1;
  const pct = Math.round((v / maxV) * 100);
  return Math.max(0, Math.min(100, pct));
};

function bandForHour(h: number): BandKey | null {
  const b = BANDS.find((x) => h >= x.start && h <= x.end);
  return b?.key ?? null;
}

/* =========================
   Card 3: KPIs actividad (Actividad hoy)
========================= */
const total = computed(() => actividad.value?.total ?? 0);
const desayuno = computed(() => actividad.value?.desayuno ?? 0);
const almuerzo = computed(() => actividad.value?.almuerzo ?? 0);
const once = computed(() => actividad.value?.once ?? 0);

const ayerTotal = computed(() => actividad.value?.ayerHastaAhora?.total ?? 0);
const delta = computed(() => actividad.value?.comparacion?.delta ?? 0);
const pctText = computed(() => {
  const v = actividad.value?.comparacion?.pct ?? null;
  return v === null ? "—" : `${v}%`;
});

const actividadUpdatedAt = computed(() =>
  formatIsoCL(actividad.value?.serverTime),
);

/* tooltip hora */
function showTipHora(ev: MouseEvent, h: number, c: number) {
  const el = ev.currentTarget as HTMLElement | null;
  if (!el) return;
  const r = el.getBoundingClientRect();
  tipHora.value = {
    x: r.left + r.width / 2,
    y: r.top - 10,
    text: `${formatHour(h)} • ${c} consumos`,
  };
}
function hideTipHora() {
  tipHora.value = null;
}

/* =========================
   Card 2: Capacidad actual (Ocupación)
========================= */
const ocuPct = computed(() => ocupacion.value?.porcentaje ?? 0);
const ocuCap = computed(() => ocupacion.value?.capacidad ?? 0);
const ocuNow = computed(() => ocupacion.value?.ocupacion ?? 0);
const ocuVentana = computed(() => ocupacion.value?.ventanaMin ?? 30);
const ocuUpdatedAt = computed(() => formatIsoCL(ocupacion.value?.serverTime));

const semaforo = computed(() => {
  const p = ocuPct.value;
  // Ajusta umbrales si quieres:
  if (p >= 85) return { key: "rojo" as const, label: "Alta" };
  if (p >= 60) return { key: "amarillo" as const, label: "Media" };
  return { key: "verde" as const, label: "Baja" };
});

/* =========================
   Card 4: Última semana (barras por día + tooltip + click)
========================= */
const semanaRangeText = computed(() => {
  if (!semana.value) return "—";
  return `${semana.value.desde} → ${semana.value.hasta}`;
});

const maxCountSemana = computed(() => {
  const ds = semana.value?.dias ?? [];
  const maxV = Math.max(
    0,
    ...ds.map((d) => d.desayuno),
    ...ds.map((d) => d.almuerzo),
    ...ds.map((d) => d.once),
  );
  return maxV;
});

const yTicksSemana = computed(() => {
  const maxV = maxCountSemana.value;
  const mid = maxV ? Math.ceil(maxV / 2) : 0;
  return { max: maxV, mid, min: 0 };
});

// ✅ también en % (alinea perfecto con grid lines)
const barHeightPctSemana = (v: number) => {
  const maxV = maxCountSemana.value || 1;
  const pct = Math.round((v / maxV) * 100);
  return Math.max(0, Math.min(100, pct));
};

const semanaUpdatedAt = computed(() => formatIsoCL(semana.value?.serverTime));

function pickDay(fecha: string) {
  selectedFecha.value = fecha; // ✅ NO Date(), NO UTC
}

/* tooltip semana */
function showTipSemana(
  ev: MouseEvent,
  dia: SemanaDia,
  tipo: "desayuno" | "almuerzo" | "once",
  val: number,
) {
  const el = ev.currentTarget as HTMLElement | null;
  if (!el) return;
  const r = el.getBoundingClientRect();

  const label =
    tipo === "desayuno"
      ? "Desayuno"
      : tipo === "almuerzo"
        ? "Almuerzo"
        : "Once";
  tipSemana.value = {
    x: r.left + r.width / 2,
    y: r.top - 10,
    text: `${ymdToShortDM(dia.fecha)} • ${label}: ${val}`,
  };
}
function hideTipSemana() {
  tipSemana.value = null;
}

/* =========================
   Fetch + SSE
========================= */
async function loadActividadHoy() {
  loadingActividad.value = true;
  errorActividad.value = null;
  try {
    const { data } = await http.get<ActividadHoyDTO>("/actividad/hoy");
    actividad.value = data;
    prevTotal.value = data.total ?? 0;
  } catch {
    errorActividad.value = "No se pudo cargar la actividad de hoy";
  } finally {
    loadingActividad.value = false;
  }
}

function startActividadSse() {
  sse.subscribe(
    "actividad_hoy",
    "/api/actividad/hoy/stream",
    {
      onMessage: (ev) => {
        try {
          const next = JSON.parse(ev.data) as ActividadHoyDTO;

          const nextTotal = next.total ?? 0;
          if (nextTotal > prevTotal.value) {
            bumpTotal.value = true;
            window.setTimeout(() => (bumpTotal.value = false), 220);
          }

          prevTotal.value = nextTotal;
          actividad.value = next;
          errorActividad.value = null;
        } catch {
          // ignora payload malo
        }
      },
    },
    { retryMs: 3000 },
  );
}

function stopActividadSse() {
  sse.unsubscribe("actividad_hoy");
}

async function loadOcupacionOnce() {
  loadingOcu.value = true;
  errorOcu.value = null;
  try {
    const { data } = await http.get<OcupacionDTO>(buildOcupacionUrl());
    ocupacion.value = data;
  } catch {
    errorOcu.value = "No se pudo cargar la capacidad actual";
  } finally {
    loadingOcu.value = false;
  }
}

function startOcupacionSse() {
  sse.subscribe(
    "ocupacion",
    buildOcupacionSseUrl(),
    {
      onMessage: (ev) => {
        try {
          const next = JSON.parse(ev.data) as OcupacionDTO;
          ocupacion.value = next;
          errorOcu.value = null;
        } catch {
          // ignora payload malo
        }
      },
    },
    { retryMs: 3000 },
  );
}

watch(tipoActual, async () => {
  stopOcupacionSse();
  await loadOcupacionOnce();
  startOcupacionSse();
});

function stopOcupacionSse() {
  sse.unsubscribe("ocupacion");
}

async function loadUltimaSemana() {
  loadingSemana.value = true;
  errorSemana.value = null;
  try {
    const { data } = await http.get<UltimaSemanaDTO>("/aforo/ultima-semana");
    semana.value = data;

    // ✅ CLAVE: el "hoy" del dataset es `hasta` (MySQL CURDATE).
    // Evita corrimientos por UTC en el frontend.
    if (!selectedFecha.value) selectedFecha.value = data.hasta;
  } catch {
    errorSemana.value = "No se pudo cargar el consumo de la última semana";
  } finally {
    loadingSemana.value = false;
  }
}

onMounted(async () => {
  tickHora();
  tHora = window.setInterval(tickHora, 30_000);

  await Promise.all([
    loadActividadHoy(),
    loadOcupacionOnce(),
    loadUltimaSemana(),
  ]);

  startActividadSse();
  startOcupacionSse();
});

onUnmounted(() => {
  stopActividadSse();
  stopOcupacionSse();

  if (tHora) clearInterval(tHora);
});
</script>

<template>
  <div class="admin-container-fluid">
    <div class="card-box-admin">
      <!-- 1) Consumos por hora -->
      <div class="card-admin graficos-card">
        <h2>Consumos por hora</h2>

        <div v-if="loadingActividad" class="estado">Cargando...</div>
        <div v-else-if="errorActividad" class="estado estado-error">
          {{ errorActividad }}
        </div>

        <div v-else class="graficos-body">
          <div class="chart-head">
            <div class="chart-title">Actividad casino hoy</div>
            <div class="chart-max">Max: {{ maxCountHora }}</div>
          </div>

          <div class="chart-wrap">
            <div class="y-axis">
              <div class="y-tick">{{ yTicksHora.max }}</div>
              <div class="y-tick">{{ yTicksHora.mid }}</div>
              <div class="y-tick">{{ yTicksHora.min }}</div>
            </div>

            <div class="chart-area">
              <div class="grid-line top"></div>
              <div class="grid-line mid"></div>
              <div class="grid-line base"></div>

              <div class="bands">
                <div
                  v-for="b in BANDS"
                  :key="b.key"
                  class="band"
                  :class="[`band-${b.key}`]"
                  :style="{
                    left:
                      ((b.start - minHour) / (maxHour - minHour + 1)) * 100 +
                      '%',
                    width:
                      ((b.end - b.start + 1) / (maxHour - minHour + 1)) * 100 +
                      '%',
                  }"
                >
                  <div class="band-label">{{ b.label }}</div>
                </div>
              </div>

              <div class="bars">
                <div v-for="p in seriesHora" :key="p.hora" class="bar-col">
                  <div
                    class="bar"
                    :class="
                      bandForHour(p.hora) ? `bar-${bandForHour(p.hora)}` : ''
                    "
                    :style="{ height: barHeightPctHora(p.cantidad) + '%' }"
                    @mouseenter="(e) => showTipHora(e, p.hora, p.cantidad)"
                    @mouseleave="hideTipHora"
                  ></div>

                  <div class="x-label">{{ formatHour(p.hora) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="graficos-footer">
            Actualizado: {{ actividadUpdatedAt }}
          </div>
        </div>
      </div>

      <!-- 2) Capacidad actual -->
      <div class="card-admin capacidad-card">
        <h2>Capacidad actual</h2>

        <div v-if="loadingOcu" class="estado">Cargando...</div>
        <div v-else-if="errorOcu" class="estado estado-error">
          {{ errorOcu }}
        </div>

        <div v-else class="cap-body">
          <div class="cap-top">
            <div class="cap-left">
              <div class="cap-big">{{ ocuNow }}</div>
              <div class="cap-sub">ocupación</div>
            </div>

            <div class="cap-right">
              <div class="cap-right-label">Capacidad</div>
              <div class="cap-right-val">{{ ocuCap }}</div>

              <div class="cap-pill" :class="`pill-${semaforo.key}`">
                {{ semaforo.label }}
              </div>
            </div>
          </div>

          <div class="cap-bar">
            <div
              class="cap-bar-fill"
              :class="`fill-${semaforo.key}`"
              :style="{ width: ocuPct + '%' }"
            ></div>
          </div>

          <div class="cap-foot">
            <div class="cap-pct">{{ ocuPct }}%</div>
            <div class="cap-ventana">Ventana: {{ ocuVentana }} min</div>
          </div>

          <div class="cap-updated">Actualizado: {{ ocuUpdatedAt }}</div>
        </div>
      </div>

      <!-- 3) Actividad casino hoy (KPIs) -->
      <div class="card-admin actividad-card">
        <h2 class="actividad-title">Actividad casino hoy</h2>

        <div v-if="loadingActividad" class="estado">Cargando...</div>
        <div v-else-if="errorActividad" class="estado estado-error">
          {{ errorActividad }}
        </div>

        <div v-else class="actividad-body">
          <div class="actividad-subtitle">vs ayer</div>

          <div class="actividad-top-row">
            <div class="actividad-box">
              <div class="actividad-label">Total consumos</div>
              <div
                class="actividad-value actividad-value-big"
                :class="{ bump: bumpTotal }"
              >
                {{ total }}
              </div>
            </div>

            <div class="actividad-box">
              <div class="actividad-label">Ayer</div>
              <div class="actividad-value">{{ ayerTotal }}</div>
            </div>

            <div class="actividad-box">
              <div class="actividad-label">Δ</div>
              <div class="actividad-value">
                {{ delta >= 0 ? `+${delta}` : delta }}
              </div>
            </div>

            <div class="actividad-box">
              <div class="actividad-label">%</div>
              <div class="actividad-value">{{ pctText }}</div>
            </div>
          </div>

          <div class="actividad-mini-row">
            <div class="actividad-box actividad-mini">
              <div class="actividad-label">Desayuno</div>
              <div class="actividad-value">{{ desayuno }}</div>
            </div>

            <div class="actividad-box actividad-mini">
              <div class="actividad-label">Almuerzo</div>
              <div class="actividad-value">{{ almuerzo }}</div>
            </div>

            <div class="actividad-box actividad-mini">
              <div class="actividad-label">Once</div>
              <div class="actividad-value">{{ once }}</div>
            </div>
          </div>

          <div class="actividad-footer">
            Actualizado: {{ actividadUpdatedAt }}
          </div>
        </div>
      </div>

      <!-- 4) Consumo casino última semana -->
      <div class="card-admin semana-card">
        <h2>Consumo casino última semana</h2>

        <div v-if="loadingSemana" class="estado">Cargando...</div>
        <div v-else-if="errorSemana" class="estado estado-error">
          {{ errorSemana }}
        </div>

        <div v-else class="semana-body">
          <div class="semana-head">
            <div class="semana-range">{{ semanaRangeText }}</div>
            <div class="semana-max">Max: {{ maxCountSemana }}</div>
          </div>

          <div class="semana-wrap">
            <div class="y-axis">
              <div class="y-tick">{{ yTicksSemana.max }}</div>
              <div class="y-tick">{{ yTicksSemana.mid }}</div>
              <div class="y-tick">{{ yTicksSemana.min }}</div>
            </div>

            <div class="chart-area">
              <div class="grid-line top"></div>
              <div class="grid-line mid"></div>
              <div class="grid-line base"></div>

              <div class="week-bars">
                <div
                  v-for="d in semana?.dias ?? []"
                  :key="d.fecha"
                  class="day-col"
                  :class="{ active: d.fecha === selectedFecha }"
                  @click="pickDay(d.fecha)"
                >
                  <div class="day-stack">
                    <div
                      class="wbar wbar-des"
                      :style="{ height: barHeightPctSemana(d.desayuno) + '%' }"
                      @mouseenter="
                        (e) => showTipSemana(e, d, 'desayuno', d.desayuno)
                      "
                      @mouseleave="hideTipSemana"
                    ></div>
                    <div
                      class="wbar wbar-alm"
                      :style="{ height: barHeightPctSemana(d.almuerzo) + '%' }"
                      @mouseenter="
                        (e) => showTipSemana(e, d, 'almuerzo', d.almuerzo)
                      "
                      @mouseleave="hideTipSemana"
                    ></div>
                    <div
                      class="wbar wbar-onc"
                      :style="{ height: barHeightPctSemana(d.once) + '%' }"
                      @mouseenter="(e) => showTipSemana(e, d, 'once', d.once)"
                      @mouseleave="hideTipSemana"
                    ></div>
                  </div>

                  <div class="day-label">{{ ymdToShortDM(d.fecha) }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="semana-legend">
            <span class="lg"><i class="dot dot-des"></i> Desayuno</span>
            <span class="lg"><i class="dot dot-alm"></i> Almuerzo</span>
            <span class="lg"><i class="dot dot-onc"></i> Once</span>
          </div>

          <div class="semana-footer">Actualizado: {{ semanaUpdatedAt }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- tooltips -->
  <teleport to="body">
    <div
      v-if="tipHora"
      class="tooltip"
      :style="{ left: tipHora.x + 'px', top: tipHora.y + 'px' }"
    >
      {{ tipHora.text }}
    </div>
    <div
      v-if="tipSemana"
      class="tooltip"
      :style="{ left: tipSemana.x + 'px', top: tipSemana.y + 'px' }"
    >
      {{ tipSemana.text }}
    </div>
  </teleport>
</template>

<style scoped>
/* ===== estados ===== */
.estado {
  margin-top: 10px;
  font-size: 14px;
  opacity: 0.85;
}
.estado-error {
  opacity: 1;
}

/* =========================
   Card 1 (chart hora)
========================= */
.graficos-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.graficos-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chart-head {
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex: 0 0 auto;
}
.chart-title {
  font-size: 16px;
  opacity: 0.78;
}
.chart-max {
  font-size: 15px;
  opacity: 0.65;
}

.chart-wrap {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.y-axis {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-top: 6px;
  padding-bottom: 22px;
}
.y-tick {
  font-size: 14px;
  opacity: 0.55;
}

.chart-area {
  position: relative;
  height: 100%;
  padding-bottom: 22px;
}

/* grid lines */
.grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
}
.grid-line.top {
  top: 6px;
}
.grid-line.mid {
  top: 50%;
  transform: translateY(-50%);
}
.grid-line.base {
  bottom: 22px;
}

/* bandas */
.bands {
  position: absolute;
  inset: 0;
  padding-bottom: 22px;
  pointer-events: none;
}
.band {
  position: absolute;
  top: 6px;
  bottom: 22px;
  border-radius: 12px;
  opacity: 0.22;
}
.band-label {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 14px;
  opacity: 0.28;
  font-weight: 700;
}
.band-desayuno {
  background: rgba(255, 220, 120, 0.55);
}
.band-almuerzo {
  background: rgba(120, 175, 255, 0.55);
}
.band-once {
  background: rgba(140, 220, 140, 0.55);
}

/* barras (hora) */
.bars {
  position: absolute;
  inset: 0;
  padding-top: 6px;
  padding-bottom: 0px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: end;
  gap: 10px;
}
.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.bar {
  width: 100%;
  max-width: 46px;
  border-radius: 12px 12px 6px 6px;
  background: rgba(35, 45, 90, 0.7);
  transition:
    transform 0.12s ease,
    opacity 0.12s ease;
}
.bar:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}
.bar-desayuno {
  background: rgba(145, 110, 25, 0.65);
}
.bar-almuerzo {
  background: rgba(35, 70, 145, 0.68);
}
.bar-once {
  background: rgba(35, 110, 55, 0.68);
}

.x-label {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.55;
  white-space: nowrap;
}

.graficos-footer {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.6;
  flex: 0 0 auto;
}

/* =========================
   Card 2 (capacidad)
========================= */
.capacidad-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cap-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cap-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.cap-big {
  font-size: 44px;
  font-weight: 900;
  line-height: 1;
}
.cap-sub {
  margin-top: 4px;
  opacity: 0.65;
  font-size: 16px;
}
.cap-right {
  text-align: right;
}
.cap-right-label {
  opacity: 0.6;
  font-size: 14px;
}
.cap-right-val {
  font-size: 22px;
  font-weight: 900;
  margin-top: 4px;
}

.cap-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.pill-verde {
  background: rgba(180, 235, 180, 0.35);
}
.pill-amarillo {
  background: rgba(255, 235, 160, 0.45);
}
.pill-rojo {
  background: rgba(255, 180, 180, 0.45);
}

.cap-bar {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.cap-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}
.fill-verde {
  background: rgba(35, 140, 70, 0.65);
}
.fill-amarillo {
  background: rgba(200, 150, 30, 0.65);
}
.fill-rojo {
  background: rgba(185, 55, 55, 0.65);
}

.cap-foot {
  display: flex;
  justify-content: space-between;
  opacity: 0.7;
  font-size: 14px;
}
.cap-updated {
  margin-top: 52px;
  font-size: 12px;
  opacity: 0.6;
}

/* =========================
   Card 3 (KPIs actividad)
========================= */
.actividad-title {
  text-align: center;
  margin: 0 0 8px 0;
}
.actividad-body {
  margin-top: 10px;
}
.actividad-subtitle {
  text-align: center;
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 12px;
}

.actividad-top-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.actividad-mini-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 14px;
}

.actividad-box {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 14px;
  height: 86px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.actividad-label {
  font-size: 14px;
  opacity: 0.6;
}
.actividad-value {
  font-size: 22px;
  font-weight: 800;
  margin-top: 6px;
}
.actividad-value-big {
  font-size: 28px;
}
.bump {
  animation: bump 0.22s ease;
}
@keyframes bump {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}
.actividad-footer {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.6;
}

/* =========================
   Card 4 (última semana)
========================= */
.semana-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ✅ asegura que el contenido NO aplaste el gráfico */
.semana-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.semana-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 10px;
}
.semana-range {
  opacity: 0.75;
  font-size: 16px;
}
.semana-max {
  opacity: 0.65;
  font-size: 15px;
}

/* ✅ ESTE ES EL CAMBIO IMPORTANTE */
.semana-wrap {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  padding: 14px;

  /* antes: flex:1 / min-height:0 */
  flex: 0 0 auto;

  /* ✅ dale altura real al chart */
  height: 155px; /* prueba 240–280 */
  min-height: 150px;

  overflow: hidden;
}

/* ✅ más área útil para barras */
.semana-wrap .chart-area {
  position: relative;
  height: 100%;
  padding-bottom: 28px; /* antes 22 */
}

/* barras semana */
.week-bars {
  position: absolute;
  inset: 0;
  padding-top: 10px; /* antes 6 */
  padding-bottom: 0px; /* antes 22 */

  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  align-items: end;
  gap: 12px;
}

/* opcional: que la etiqueta no coma tanto */
.day-label {
  margin-top: 10px;
  font-size: 12px; /* antes 13 */
  opacity: 0.6;
  white-space: nowrap;
}

.day-col {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  cursor: pointer;
  border-radius: 16px;
  padding: 6px 6px 0 6px;
  transition:
    background 0.15s ease,
    outline 0.15s ease;
}
.day-col.active {
  background: rgba(35, 45, 90, 0.04);
  outline: 2px solid rgba(35, 45, 90, 0.08);
}

.day-stack {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-items: end;
}

.wbar {
  width: 100%;
  border-radius: 14px 14px 8px 8px;
  transition:
    transform 0.12s ease,
    opacity 0.12s ease;
}
.wbar:hover {
  transform: translateY(-2px);
  opacity: 0.95;
}

.wbar-des {
  background: rgba(145, 110, 25, 0.55);
}
.wbar-alm {
  background: rgba(35, 70, 145, 0.55);
}
.wbar-onc {
  background: rgba(35, 110, 55, 0.55);
}

.day-label {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.6;
  white-space: nowrap;
}

.semana-legend {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-top: 10px;
  opacity: 0.75;
  font-size: 14px;
}
.lg {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}
.dot-des {
  background: rgba(145, 110, 25, 0.55);
}
.dot-alm {
  background: rgba(35, 70, 145, 0.55);
}
.dot-onc {
  background: rgba(35, 110, 55, 0.55);
}

.semana-footer {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.6;
}

/* =========================
   Tooltip
========================= */
.tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: rgba(20, 20, 25, 0.92);
  color: #fff;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 9999;
  white-space: nowrap;
}
</style>
