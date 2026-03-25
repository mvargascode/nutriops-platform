<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  onActivated,
  onDeactivated,
} from "vue";
import { useRoute, onBeforeRouteLeave } from "vue-router";
import { getAforoActual, getAforoHoy, type TipoComida } from "@/api/casino";
import {
  obtenerNutricionHoy,
  obtenerNutricionSemana,
  type NutricionItem,
} from "@/api/nutricion";
import GaugeSemi from "@/components/GaugeSemi.vue";
import { useTweenNumber } from "@/composables/useTweenNumber";
import { useAuthStore } from "@/stores/auth";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import { useSseStore } from "@/stores/sse";
import fondoCasino from "@/assets/img/fondo6.png";

const route = useRoute();

const sse = useSseStore();

const auth = useAuthStore();
if (!auth.hydrated) auth.hydrate();

// ===== Estado =====
const activeTab = ref<"diario" | "mensual">("diario");
function activar(tab: "diario" | "mensual") {
  activeTab.value = tab;
}

// Aforo (Totales del día)
const aforoTotal = ref(0);
const hoyTotal = ref(0);
const hoyTotalAnim = useTweenNumber(hoyTotal, { duration: 500, precision: 0 });

// --- Hora local Chile
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

// Horario oficial para mostrar menú/nutrición
const inService = computed(() => {
  const h = horaCL.value;
  return h >= 6 && h < 21;
});

// Tipo actual según horario oficial (para queries)
const tipoActual = computed<TipoComida | 1 | 2 | 3>(() => {
  const h = horaCL.value;
  if (h >= 6 && h < 10) return 1; // desayuno
  if (h >= 10 && h < 16) return 2; // almuerzo
  if (h >= 16 && h < 21) return 3; // cena
  return 2;
});

const labelTipo = computed(() =>
  tipoActual.value === 1
    ? "Desayunos"
    : tipoActual.value === 2
      ? "Almuerzos"
      : "Cenas",
);

function ventanaPorTipo(tipo: TipoComida): number {
  if (tipo === 1) return 25;
  if (tipo === 2) return 60;
  return 30;
}

// Título del menú (card izquierda)
const menuTitle = computed(() => {
  const h = horaCL.value;
  if (h >= 6 && h < 10) return "Desayuno del día";
  if (h >= 10 && h < 16) return "Almuerzo del día";
  if (h >= 16 && h < 21) return "Cena del día";
  return "Menú del día";
});

/* ===========================
   Reglas visuales por tipo
=========================== */
const isDesayuno = computed(() => Number(tipoActual.value) === 1);

const labelPrincipal = computed(() =>
  isDesayuno.value ? "Preparación:" : "Plato principal:",
);
const showEnsalada = computed(() => !isDesayuno.value);
const showPostre = computed(() => !isDesayuno.value);
const showBebestible = computed(() => !isDesayuno.value);

// Nutrición (HOY desde BD)
const fechaNutri = ref("");
const itemsNutri = ref<NutricionItem[]>([]);

function pickByOrdenFrom(
  list: NutricionItem[],
  ord: number,
): NutricionItem | null {
  const found = list.find((x: any) => Number((x as any).orden) === ord);
  return found ?? null;
}
function pickByOrden(ord: number): NutricionItem | null {
  return pickByOrdenFrom(itemsNutri.value, ord);
}

const nutriOne = computed<NutricionItem | null>(() => {
  if (!itemsNutri.value.length) return null;
  return pickByOrden(1) ?? itemsNutri.value[0];
});

const menuFromDb = computed(() => {
  const principal = pickByOrden(1);
  const ensalada = pickByOrden(2);
  const postre = pickByOrden(3);
  const bebestible = pickByOrden(4);

  return {
    principal: principal?.item ?? "Sin datos",
    ensalada: ensalada?.item ?? "Sin datos",
    postre: postre?.item ?? "Sin datos",
    bebestible: bebestible?.item ?? null,
  };
});

const tipText = computed(() => {
  const c = (nutriOne.value as any)?.comentario;
  if (typeof c === "string" && c.trim()) return c.trim();
  return "Sin comentario para hoy.";
});

/* ===========================
   ADDON PAN
=========================== */
const addPan = ref(false);
const PAN = { kcal: 190, proteinas_g: 6, grasas_g: 2, carbohidratos_g: 38 };
function n(v: any): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}
const showPanToggle = computed(() => !isDesayuno.value);

const nutriShown = computed(() => {
  if (!nutriOne.value) return null;

  const base = {
    kcal: n(nutriOne.value.kcal),
    proteinas_g: n(nutriOne.value.proteinas_g),
    grasas_g: n(nutriOne.value.grasas_g),
    carbohidratos_g: n(nutriOne.value.carbohidratos_g),
  };

  if (!addPan.value) return base;

  return {
    kcal: base.kcal + PAN.kcal,
    proteinas_g: base.proteinas_g + PAN.proteinas_g,
    grasas_g: base.grasas_g + PAN.grasas_g,
    carbohidratos_g: base.carbohidratos_g + PAN.carbohidratos_g,
  };
});

// Ocupación (gauge)
const ocupacion = ref(0);
const capacidad = ref(0);
const ocupacionAnim = useTweenNumber(ocupacion, {
  duration: 600,
  precision: 0,
});

// Errores
const aforoErr = ref<string | null>(null);
const nutriErr = ref<string | null>(null);
const ocuErr = ref<string | null>(null);

let busyAforo = false;
let busyNutri = false;

function errMsg(e: unknown): string {
  const any = e as any;
  if (any?.response) {
    const s = any.response.status;
    const m = any.response.data?.message ?? any.message;
    return `HTTP ${s}${m ? ` – ${m}` : ""}`;
  }
  return (any?.message as string) ?? "Error inesperado";
}

// === Aforo: detalle por tipo para KPI “Hoy llevamos”
const detalleHoy = ref<{ tipo: 1 | 2 | 3; cantidad: number }[]>([]);
const hoyPorTipo = computed(() => {
  const t = Number(tipoActual.value);
  return detalleHoy.value.find((d) => d.tipo === t)?.cantidad ?? 0;
});

async function cargarAforo() {
  if (busyAforo) return;
  busyAforo = true;
  try {
    const [{ aforo_total }, resumen] = await Promise.all([
      getAforoActual(),
      getAforoHoy() as Promise<{
        fecha: string;
        detalle: { tipo: 1 | 2 | 3; cantidad: number }[];
        total: number;
      }>,
    ]);
    aforoTotal.value = aforo_total ?? 0;
    detalleHoy.value = resumen.detalle ?? [];
    hoyTotal.value = hoyPorTipo.value;
    aforoErr.value = null;
  } catch (e) {
    aforoErr.value = errMsg(e);
    console.error("[cargarAforo]", e);
  } finally {
    busyAforo = false;
  }
}

async function cargarNutricion() {
  if (!inService.value) {
    fechaNutri.value = "";
    itemsNutri.value = [];
    nutriErr.value = null;
    addPan.value = false;
    return;
  }

  if (busyNutri) return;
  busyNutri = true;
  try {
    const d = await obtenerNutricionHoy(tipoActual.value as 1 | 2 | 3);
    fechaNutri.value = d.fecha;
    itemsNutri.value = d.items ?? [];
    nutriErr.value = null;
    addPan.value = false;
  } catch (e) {
    const any = e as any;
    const status = any?.response?.status;
    if (status === 404) {
      fechaNutri.value = "";
      itemsNutri.value = [];
      nutriErr.value = null;
      addPan.value = false;
      return;
    }
    nutriErr.value = errMsg(e);
    console.error("[cargarNutricion]", e);
  } finally {
    busyNutri = false;
  }
}

/* ===========================
   MENÚ SEMANAL (desde BD)
=========================== */
type WeekDay = {
  fecha: string;
  label: string;
  byTipo: { 1: NutricionItem[]; 2: NutricionItem[]; 3: NutricionItem[] };
};

const weeklyLoading = ref(false);
const weeklyErr = ref<string | null>(null);
const weeklyDays = ref<WeekDay[]>([]);
const weeklyDesde = ref("");
const weeklyHasta = ref("");

// HOY (Chile) en ISO
const todayISO = computed(() => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
});

const weeklyOpen = ref<Set<string>>(new Set());

function isOpenDay(fecha: string) {
  return weeklyOpen.value.has(fecha);
}

function onToggleDay(e: Event, fecha: string) {
  const el = e.target as HTMLDetailsElement | null;
  if (!el) return;

  const next = new Set(weeklyOpen.value);
  if (el.open) next.add(fecha);
  else next.delete(fecha);
  weeklyOpen.value = next;
}

async function scrollToTodayInWeekly() {
  if (activeTab.value !== "mensual") return;
  await nextTick();

  const el = document.getElementById(`week-day-${todayISO.value}`);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function toISODateCL(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}
function startOfWeekMondayCL(base: Date): Date {
  const iso = toISODateCL(base);
  const [yy, mm, dd] = iso.split("-").map(Number);
  const clDate = new Date(yy, (mm ?? 1) - 1, dd ?? 1);
  const dow = clDate.getDay(); // 0 dom..6 sáb
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(clDate, diff);
}
function dayLabelCL(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  const w = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(dt);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${String(d ?? 1).padStart(2, "0")}`;
}
function normalizeWeekDays(desdeISO: string): WeekDay[] {
  const [y, m, d] = desdeISO.split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);

  return Array.from({ length: 7 }).map((_, i) => {
    const dt = addDays(base, i);
    const iso = toISODateCL(dt);
    return {
      fecha: iso,
      label: dayLabelCL(iso),
      byTipo: { 1: [], 2: [], 3: [] },
    };
  });
}
function mapTipoLabel(tipo: 1 | 2 | 3) {
  return tipo === 1 ? "Desayuno" : tipo === 2 ? "Almuerzo" : "Once";
}
function mapOrdenLabel(ord: number, tipo: 1 | 2 | 3) {
  if (tipo === 1) return "Preparación";
  if (ord === 1) return "Principal";
  if (ord === 2) return "Ensalada/Acomp.";
  if (ord === 3) return "Postre";
  if (ord === 4) return "Bebestible/Otros";
  return `Orden ${ord}`;
}

function initWeeklyOpenDefault(days: WeekDay[]) {
  const next = new Set<string>();
  const hasToday = days.some((d) => d.fecha === todayISO.value);
  if (hasToday) next.add(todayISO.value);
  else if (days[0]?.fecha) next.add(days[0].fecha);
  weeklyOpen.value = next;
}

async function cargarMenuSemanal() {
  if (weeklyLoading.value) return;
  weeklyLoading.value = true;
  weeklyErr.value = null;

  try {
    const lunes = startOfWeekMondayCL(new Date());
    const desde = toISODateCL(lunes);
    const hasta = toISODateCL(addDays(lunes, 6));

    weeklyDesde.value = desde;
    weeklyHasta.value = hasta;

    const baseDays = normalizeWeekDays(desde);
    const index = new Map(baseDays.map((d) => [d.fecha, d] as const));

    const payload = await obtenerNutricionSemana(desde, hasta);

    for (const row of payload.rows ?? []) {
      const f = String((row as any).fecha ?? "");
      const t = Number((row as any).tipo) as 1 | 2 | 3;
      if (!index.has(f)) continue;
      if (t !== 1 && t !== 2 && t !== 3) continue;

      const normalized: NutricionItem = {
        ...row,
        orden: Number((row as any).orden ?? 1),
      };

      index.get(f)!.byTipo[t].push(normalized);
    }

    for (const d of baseDays) {
      for (const t of [1, 2, 3] as const) {
        d.byTipo[t].sort((a: any, b: any) => Number(a.orden) - Number(b.orden));
      }
    }

    weeklyDays.value = baseDays;
    initWeeklyOpenDefault(baseDays);
    void scrollToTodayInWeekly();
  } catch (e) {
    weeklyErr.value = errMsg(e);
    weeklyDays.value = [];
    weeklyOpen.value = new Set();
    console.error("[cargarMenuSemanal]", e);
  } finally {
    weeklyLoading.value = false;
  }
}

function buildOcuStreamUrl() {
  const tipo = tipoActual.value as TipoComida;
  const ventana = ventanaPorTipo(tipo);
  const qs = new URLSearchParams({
    tipo: String(tipo),
    ventanaMin: String(ventana),
  });
  return `/api/aforo/ocupacion/stream?${qs.toString()}`;
}

function startOcupacionChannel() {
  if (!inService.value) {
    sse.unsubscribe("ocupacion");
    ocupacion.value = 0;
    capacidad.value = 0;
    ocuErr.value = null;
    document.title = "NutriOps";
    return;
  }

  const url = buildOcuStreamUrl();

  sse.subscribe(
    "ocupacion",
    url,
    {
      onOpen: () => {
        ocuErr.value = null;
      },
      onMessage: (ev) => {
        try {
          const d = JSON.parse(ev.data);
          ocupacion.value = Number(d.ocupacion ?? 0);
          capacidad.value = Number(d.capacidad ?? 0);
          ocuErr.value = null;
          document.title = `Casino NutriOps · Capacidad: ${ocupacion.value}`;
        } catch (err) {
          console.warn("[SSE ocupacion] payload inválido", err);
        }
      },
      onError: () => {
        if (!ocuErr.value)
          ocuErr.value = "Conexión realtime inestable. Reintentando...";
      },
    },
    { retryMs: 3000 },
  );
}

function stopOcupacionChannel() {
  sse.unsubscribe("ocupacion");
  document.title = "Casino NutriOps";
}

/* ===========================
  Cierre SSE al cambiar de ruta (FIX definitivo)
=========================== */
onBeforeRouteLeave(() => {
  stopOcupacionChannel();
  document.title = "Casino NutriOps";
});

/* ===========================
  Modal: Capacidad casi llena
=========================== */
const capModalOpen = ref(false);

const THRESH_MODAL = 140;
const THRESH_RESET = 135;
const COOLDOWN_MS = 10 * 60 * 1000;

const lastCapModalAt = ref<number>(0);
const armedForModal = ref(true);

const SUPPRESS_KEY = "nutriops_cap_modal_suppress_until";
function suppressUntilTs(): number {
  const raw = localStorage.getItem(SUPPRESS_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}
function isSuppressedNow(): boolean {
  return Date.now() < suppressUntilTs();
}
function suppressFor(ms: number) {
  localStorage.setItem(SUPPRESS_KEY, String(Date.now() + ms));
}
function openCapModal() {
  capModalOpen.value = true;
}
function closeCapModal() {
  capModalOpen.value = false;
}
function dontShowFor1h() {
  suppressFor(60 * 60 * 1000);
  capModalOpen.value = false;
}

watch(ocupacion, (now) => {
  if (!inService.value) return;

  if (now <= THRESH_RESET) armedForModal.value = true;
  if (isSuppressedNow()) return;

  const canCooldown = Date.now() - lastCapModalAt.value >= COOLDOWN_MS;

  if (armedForModal.value && now >= THRESH_MODAL && canCooldown) {
    lastCapModalAt.value = Date.now();
    armedForModal.value = false;
    openCapModal();
  }
});

/* ===========================
  Timers
=========================== */
const REFRESH_MS = 3_000;
const REFRESH_WEEK_MS = 60_000;

let tAforo: number | undefined, tWeek: number | undefined;

onMounted(() => {
  tickHora();
  tHora = window.setInterval(tickHora, 30_000);

  void cargarAforo();
  void cargarNutricion();
  void cargarMenuSemanal();

  tAforo = window.setInterval(cargarAforo, REFRESH_MS);
  tWeek = window.setInterval(() => void cargarMenuSemanal(), REFRESH_WEEK_MS);

  startOcupacionChannel(); // ← este es el importante
});

// Al entrar al tab semanal: carga (si falta), setea open y scrollea a HOY
watch(
  () => activeTab.value,
  async (tab) => {
    if (tab !== "mensual") return;

    if (!weeklyDays.value.length && !weeklyLoading.value) {
      await cargarMenuSemanal();
    } else {
      initWeeklyOpenDefault(weeklyDays.value);
      void scrollToTodayInWeekly();
    }
  },
);

// ✅ Soporte KeepAlive (por si lo agregas en el futuro)
onActivated(() => {
  startOcupacionChannel();
});
onDeactivated(() => {
  stopOcupacionChannel();
});

onUnmounted(() => {
  stopOcupacionChannel();
  document.title = "Casino NutriOps";

  if (tHora) clearInterval(tHora);
  if (tAforo) clearInterval(tAforo);
  if (tWeek) clearInterval(tWeek);
});

const gaugeMax = computed(() =>
  Number(capacidad.value || aforoTotal.value || 160),
);

const gaugeColor = computed(() => {
  const max = gaugeMax.value || 1;
  const v = Number(ocupacion.value || 0);
  const p = v / max;

  if (p <= 0.5) return "#16a34a"; // verde (~0–80 si max=160)
  if (p <= 0.8125) return "#f59e0b"; // amarillo (~81–130 si max=160)
  return "#dc2626"; // rojo
});
</script>

<template>
  <div
    class="page dashboard-bg"
    :style="{ backgroundImage: `url(${fondoCasino})` }"
  >
    <AppHeader
      :show-nav="true"
      right-link-text="Links"
      right-link-href="#"
    />

    <main>
      <section class="contenedor-principal">
        <div class="tabs">
          <div
            class="pestaña pestaña-diario"
            :class="{ activa: activeTab === 'diario' }"
            @click="activar('diario')"
          >
            <h2>Menú Diario</h2>
          </div>

          <div
            class="pestaña pestaña-mensual"
            :class="{ activa: activeTab === 'mensual' }"
            @click="activar('mensual')"
          >
            <h2>Menú Semanal</h2>
          </div>
        </div>

        <section
          class="grid diario"
          :class="{ activa: activeTab === 'diario' }"
          id="activa"
        >
          <!-- Menú del día -->
          <div class="contenedor menu" style="grid-area: menu">
            <h2>{{ menuTitle }}</h2>

            <div v-if="!inService" class="dash-nutri-empty">
              Fuera de horario.
            </div>

            <template v-else>
              <p class="titulos">{{ labelPrincipal }}</p>
              <div class="comida">
                <p>{{ menuFromDb.principal }}</p>
              </div>

              <template v-if="showEnsalada">
                <p class="titulos">Ensalada:</p>
                <div class="ensalada">
                  <p>{{ menuFromDb.ensalada }}</p>
                </div>
              </template>

              <template v-if="showPostre">
                <p class="titulos">Postre:</p>
                <div class="postre">
                  <p>{{ menuFromDb.postre }}</p>
                </div>
              </template>

              <template v-if="showBebestible && menuFromDb.bebestible">
                <p class="titulos">Bebestible:</p>
                <div class="comida">
                  <p>{{ menuFromDb.bebestible }}</p>
                </div>
              </template>
            </template>
          </div>

          <!-- Nutrición -->
          <div class="contenedor nutricional" style="grid-area: nutricional">
            <h2>Tabla Nutricional</h2>

            <div v-if="!inService" class="dash-nutri-empty">
              Fuera de horario.
            </div>

            <div v-else-if="nutriOne" class="dash-nutri-one">
              <div class="dash-nutri-row">
                <span class="k">Ítem</span>
                <span class="v" :title="nutriOne.item ?? undefined">{{
                  nutriOne.item
                }}</span>
              </div>

              <div class="dash-nutri-row">
                <span class="k">Porción</span>
                <span class="v" :title="nutriOne.porcion ?? undefined">{{
                  nutriOne.porcion ?? "-"
                }}</span>
              </div>

              <div v-if="showPanToggle" class="dash-pan-toggle">
                <label class="dash-pan-label">
                  <input type="checkbox" v-model="addPan" />
                  Agregar pan
                </label>
              </div>

              <div class="dash-nutri-grid">
                <div class="m">
                  <span class="k">Kcal</span
                  ><span class="v">{{ nutriShown?.kcal ?? "-" }}</span>
                </div>
                <div class="m">
                  <span class="k">Prot (g)</span
                  ><span class="v">{{ nutriShown?.proteinas_g ?? "-" }}</span>
                </div>
                <div class="m">
                  <span class="k">Grasa (g)</span
                  ><span class="v">{{ nutriShown?.grasas_g ?? "-" }}</span>
                </div>
                <div class="m">
                  <span class="k">Carbs (g)</span
                  ><span class="v">{{
                    nutriShown?.carbohidratos_g ?? "-"
                  }}</span>
                </div>
              </div>
            </div>

            <div v-else class="dash-nutri-empty">Sin datos hoy</div>

            <p
              v-if="nutriErr"
              style="color: #b91c1c; font-size: 12px; margin-top: 0.5rem"
            >
              {{ nutriErr }}
            </p>
          </div>

          <!-- Hoy llevamos -->
          <div class="contenedor llevamos" style="grid-area: llevamos">
            <h2>Hoy llevamos:</h2>
            <div class="posit">
              <h2>
                {{
                  new Intl.NumberFormat("es-CL").format(hoyTotalAnim as number)
                }}
              </h2>
              <p>{{ labelTipo }}</p>
            </div>

            <p
              v-if="aforoErr"
              style="color: #b91c1c; font-size: 12px; margin-top: 0.5rem"
            >
              {{ aforoErr }}
            </p>
          </div>

          <!-- Capacidad -->
          <div
            class="contenedor capacidad"
            style="grid-area: capacidad; display: grid; place-items: center"
          >
            <GaugeSemi
              :value="ocupacionAnim"
              :max="capacidad || aforoTotal"
              :min="0"
              title="Capacidad Casino"
              units="usuarios"
              :showPercent="false"
              :color="gaugeColor"
            />
            <p
              v-if="ocuErr"
              style="color: #b91c1c; font-size: 12px; margin-top: 0.5rem"
            >
              {{ ocuErr }}
            </p>
          </div>

          <!-- Tips -->
          <div class="contenedor tips" style="grid-area: tips">
            <h2>Comentarios:</h2>
            <div class="cuadradoTips">
              <p>{{ tipText }}</p>
            </div>
          </div>
        </section>

        <!-- SEMANAL -->
        <section
          class="grid mensual"
          :class="{ activa: activeTab === 'mensual' }"
          id="inactivo"
        >
          <div class="weekly-wrap">
            <div class="weekly-head">
              <h2>Menú Semanal</h2>

              <div class="weekly-meta" v-if="weeklyDesde && weeklyHasta">
                <span>Semana:</span>
                <strong>{{ weeklyDesde }}</strong>
                <span>→</span>
                <strong>{{ weeklyHasta }}</strong>
              </div>
            </div>

            <p v-if="weeklyErr" class="weekly-err">{{ weeklyErr }}</p>

            <div
              v-if="weeklyLoading && !weeklyDays.length"
              class="weekly-empty"
            >
              Cargando menú semanal...
            </div>

            <div v-else-if="!weeklyDays.length" class="weekly-empty">
              Sin datos para la semana.
            </div>

            <div v-else class="weekly-grid">
              <details
                v-for="d in weeklyDays"
                :key="d.fecha"
                class="weekly-day"
                :class="{ 'is-today': d.fecha === todayISO }"
                :id="`week-day-${d.fecha}`"
                :open="isOpenDay(d.fecha)"
                @toggle="(e) => onToggleDay(e, d.fecha)"
              >
                <summary class="weekly-day-title">
                  <div class="weekly-day-left">
                    <span class="wday">{{ d.label }}</span>
                    <span v-if="d.fecha === todayISO" class="badge-today"
                      >HOY</span
                    >
                  </div>
                  <span class="wdate">{{ d.fecha }}</span>
                </summary>

                <div class="weekly-blocks">
                  <div class="weekly-block" v-for="t in [1, 2, 3]" :key="t">
                    <div class="weekly-block-title">
                      {{ mapTipoLabel(t as 1 | 2 | 3) }}
                    </div>

                    <div
                      v-if="!d.byTipo[t as 1 | 2 | 3].length"
                      class="weekly-noitems"
                    >
                      Sin datos
                    </div>

                    <ul v-else class="weekly-items">
                      <li
                        v-for="it in d.byTipo[t as 1 | 2 | 3]"
                        :key="`${d.fecha}-${t}-${(it as any).orden}-${it.item}`"
                        class="weekly-item"
                      >
                        <span class="tag">
                          {{
                            mapOrdenLabel(
                              Number((it as any).orden ?? 1),
                              t as 1 | 2 | 3,
                            )
                          }}
                        </span>
                        <span class="txt">{{ it.item ?? "Sin ítem" }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </section>
      </section>
    </main>

    <!-- ===== MODAL: Capacidad casi llena ===== -->
    <div v-if="capModalOpen" class="capOverlay" @click="closeCapModal">
      <div class="capModal" @click.stop>
        <div class="capHead">
          <div class="capIcon">⚠️</div>
          <div class="capTitles">
            <div class="capTitle">Capacidad del casino casi llena</div>
            <div class="capSub">
              Capacidad actual: <strong>{{ ocupacion }}</strong> usuarios
              <span v-if="capacidad || aforoTotal">
                (máx: <strong>{{ capacidad || aforoTotal }}</strong
                >)
              </span>
            </div>
          </div>
        </div>

        <div class="capBody">
          <p>
            Te recomendamos considerar otro horario si te es posible para evitar
            congestión.
          </p>
        </div>

        <div class="capActions">
          <button class="capBtn ghost" @click="dontShowFor1h">
            No mostrar por 1 hora
          </button>
          <button class="capBtn" @click="closeCapModal">Entendido</button>
        </div>

        <button class="capX" aria-label="Cerrar" @click="closeCapModal">
          ✕
        </button>
      </div>
    </div>

    <AppFooter />
  </div>
</template>

<style scoped>
.comida,
.ensalada,
.postre {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 16px;
  min-height: 70px;
  box-sizing: border-box;
}

.comida p,
.ensalada p,
.postre p {
  margin: 0;
  line-height: 1.25;
  max-width: 90%;
}

.contenedor.tips {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12px;
}

.contenedor.tips h2 {
  margin: 0 0 1px 0;
}

.cuadradoTips {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 140px;
  padding: 16px;
  box-sizing: border-box;
  width: 100%;
  max-width: 190px;
  margin: 0;
}

.cuadradoTips p {
  margin: 0;
  line-height: 1.3;
}

/* ===== Nutrición ===== */
.dash-nutri-one {
  display: grid;
  gap: 10px;
}
.dash-nutri-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  align-items: start;
}
.dash-nutri-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.dash-nutri-one .k {
  font-weight: 800;
  opacity: 0.75;
  font-size: 12px;
}
.dash-nutri-one .v {
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dash-nutri-grid .m {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  display: grid;
  gap: 4px;
}
.dash-nutri-empty {
  text-align: center;
  opacity: 0.7;
  padding: 14px 12px;
}
.dash-pan-toggle {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
  margin-bottom: 2px;
}
.dash-pan-label {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  font-weight: 700;
  font-size: 13px;
  opacity: 0.9;
}

/* ===== Menú Semanal ===== */
.weekly-wrap {
  width: 100%;
  padding: 8px 8px 4px;
}
.weekly-head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}
.weekly-head h2 {
  margin: 0;
}
.weekly-meta {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  opacity: 0.85;
  font-size: 13px;
}
.weekly-err {
  color: #b91c1c;
  font-size: 12px;
  margin: 8px 0 0;
}
.weekly-empty {
  text-align: center;
  opacity: 0.8;
  padding: 18px 12px;
}
.weekly-grid {
  display: grid;
  gap: 10px;
}
.weekly-day {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  overflow: hidden;
}
.weekly-day-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 900;
}
.weekly-day-title .wdate {
  opacity: 0.7;
  font-weight: 700;
  font-size: 12px;
}
.weekly-blocks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 10px 12px 12px;
}
.weekly-block {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px;
  background: #fff;
}
.weekly-block-title {
  font-weight: 900;
  margin-bottom: 8px;
}
.weekly-noitems {
  opacity: 0.7;
  font-size: 13px;
}
.weekly-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.weekly-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: start;
}
.weekly-item .tag {
  font-size: 11px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  white-space: nowrap;
}
.weekly-item .txt {
  font-size: 13px;
  font-weight: 700;
  line-height: 25px;
}
.grid.mensual {
  overflow: hidden;
  width: 100%;
}
.weekly-wrap {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 0;
  box-sizing: border-box;
}
.weekly-grid {
  padding: 12px;
  box-sizing: border-box;
}
.weekly-head {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ebebeb;
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 12px 10px;
}
.weekly-day,
.weekly-block {
  box-sizing: border-box;
}
.weekly-day.is-today {
  background: #f1fbf4;
  border: 1px solid #86d3a6;
}
.weekly-day.is-today .weekly-day-title {
  background: #e4f7ec;
}
.weekly-day.is-today .weekly-day-title .wday {
  color: #15803d;
}
.weekly-day.is-today .weekly-day-title .wdate {
  color: #166534;
}
.weekly-day-left {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}
.badge-today {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.3px;
  color: #166534;
  background: #dff7e8;
  border: 1px solid #86d3a6;
}
@media (max-width: 980px) {
  .weekly-blocks {
    grid-template-columns: 1fr;
  }
}

/* ===== Modal Capacidad ===== */
.capOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  display: grid;
  place-items: start center; /* ✅ arriba centrado */
  padding: 90px 16px 16px; /* ✅ separación desde arriba */

  z-index: 9999;
}
.capModal {
  width: min(520px, 100%);
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  position: relative;
  overflow: hidden;

  animation: capIn 160ms ease-out; /* ✅ animación */
}
@keyframes capIn {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.capHead {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: center;
  padding: 16px 16px 10px;
  background: #fff7ed;
  border-bottom: 1px solid #fed7aa;
}
.capIcon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #ffedd5;
  border: 1px solid #fed7aa;
  font-size: 20px;
}
.capTitle {
  font-weight: 900;
  font-size: 16px;
  color: #7c2d12;
  line-height: 1.2;
}
.capSub {
  margin-top: 4px;
  font-weight: 700;
  font-size: 13px;
  color: #9a3412;
  opacity: 0.95;
}
.capBody {
  padding: 12px 16px 6px;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}
.capActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px 16px;
}
.capBtn {
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
  padding: 10px 12px;
  border-radius: 12px;
  font-weight: 900;
  cursor: pointer;
  font-size: 13px;
}
.capBtn.ghost {
  background: #fff;
  color: #111827;
  border: 1px solid #e5e7eb;
}
.capBtn:hover {
  filter: brightness(0.98);
}
.capX {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  font-weight: 900;
  cursor: pointer;
}
</style>
