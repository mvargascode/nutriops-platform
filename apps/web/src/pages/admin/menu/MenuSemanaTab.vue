<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { obtenerNutricionSemana, type NutricionItem } from "@/api/nutricion";
import "@/assets/styles/admin/semanaAdmin.css";

type MealLine = { label: string; text: string };

type DayUI = {
  fecha: string; // YYYY-MM-DD
  label: string; // "Lun 19"
  isToday: boolean;
  desayuno: MealLine[];
  almuerzo: MealLine[];
  once: MealLine[];
};

const loading = ref(false);
const error = ref<string | null>(null);

const desde = ref<string>("");
const hasta = ref<string>("");

const rows = ref<NutricionItem[]>([]);
const dias = ref<DayUI[]>([]);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Dom,1=Lun...6=Sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeekSunday(date = new Date()) {
  const m = startOfWeekMonday(date);
  const s = new Date(m);
  s.setDate(m.getDate() + 6);
  return s;
}

function labelFromISO(fechaISO: string) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dt.getDay()];
  return `${dow} ${pad2(d)}`;
}

function isTodayISO(fechaISO: string) {
  return fechaISO === toISO(new Date());
}

function buildDayUI(fecha: string, dayRows: NutricionItem[]): DayUI {
  const d1 = dayRows
    .filter((r) => r.tipo === 1)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const d2 = dayRows
    .filter((r) => r.tipo === 2)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const d3 = dayRows
    .filter((r) => r.tipo === 3)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const desayuno: MealLine[] = d1.length
    ? d1.map((x) => ({ label: "Preparación", text: x.item }))
    : [{ label: "", text: "Sin datos" }];

  const almuerzo: MealLine[] = d2.length
    ? d2.map((x) => {
        const ord = x.orden ?? 0;
        const label =
          ord === 1
            ? "Principal"
            : ord === 2
              ? "Ensalada/Acomp."
              : ord === 3
                ? "Postre"
                : ord === 4
                  ? "Otro"
                  : `Orden ${ord}`;
        return { label, text: x.item };
      })
    : [{ label: "", text: "Sin datos" }];

  const once: MealLine[] = d3.length
    ? d3.map((x) => {
        const ord = x.orden ?? 0;
        const label =
          ord === 1
            ? "Principal"
            : ord === 2
              ? "Ensalada/Acomp."
              : ord === 3
                ? "Postre"
                : ord === 4
                  ? "Otro"
                  : `Orden ${ord}`;
        return { label, text: x.item };
      })
    : [{ label: "", text: "Sin datos" }];

  return {
    fecha,
    label: labelFromISO(fecha),
    isToday: isTodayISO(fecha),
    desayuno,
    almuerzo,
    once,
  };
}

function buildWeekUI(
  desdeISO: string,
  hastaISO: string,
  weekRows: NutricionItem[],
) {
  const byDate = new Map<string, NutricionItem[]>();
  for (const r of weekRows) {
    if (!r.fecha) continue;
    const arr = byDate.get(r.fecha) ?? [];
    arr.push(r);
    byDate.set(r.fecha, arr);
  }

  const start = new Date(desdeISO + "T00:00:00");
  const end = new Date(hastaISO + "T00:00:00");

  const out: DayUI[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISO(d);
    const list = byDate.get(iso) ?? [];
    out.push(buildDayUI(iso, list));
  }

  dias.value = out;
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const start = startOfWeekMonday(new Date());
    const end = endOfWeekSunday(new Date());

    desde.value = toISO(start);
    hasta.value = toISO(end);

    const data = await obtenerNutricionSemana(desde.value, hasta.value);
    rows.value = data?.rows ?? [];
    buildWeekUI(data.desde, data.hasta, rows.value);
  } catch (e: any) {
    error.value =
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible cargar el menú semanal.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatShortDate(fechaISO: string) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${pad2(d)} ${meses[dt.getMonth()]}`;
}

const weekLabel = computed(() => {
  if (!desde.value || !hasta.value) return "";
  return `${formatShortDate(desde.value)} → ${formatShortDate(hasta.value)}`;
});

const totalDias = computed(() => dias.value.length);
</script>

<template>
  <div class="semana-card">
    <div class="menu-week-header">
      <div class="menu-week-left">
        <h2>Menú semanal</h2>

        <span v-if="weekLabel" class="week-range">
          {{ weekLabel }}
          <span v-if="totalDias" class="week-days">· {{ totalDias }} días</span>
        </span>
      </div>

      <button
        class="btn-refresh"
        type="button"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? "Cargando..." : "Actualizar" }}
      </button>
    </div>
    <!-- Mensajes (mismo patrón de Data) -->
    <div v-if="error" class="msg err">
      <strong>Error</strong>
      <div style="margin-top: 6px">{{ error }}</div>
    </div>

    <div v-else-if="loading" class="msg warn">
      <strong>Cargando</strong>
      <div style="margin-top: 6px">Obteniendo menú semanal desde la BD…</div>
    </div>

    <!-- Preview estilo Data -->
    <div v-else class="semana-preview">
      <!-- Wrapper tipo table-wrap (borde + radios + scroll interno) -->
      <div class="semana-wrap">
        <section
          v-for="d in dias"
          :key="d.fecha"
          class="semana-day"
          :class="{ 'semana-day--today': d.isToday }"
        >
          <div class="semana-day__head">
            <div class="semana-day__left">
              <span class="semana-day__label">{{ d.label }}</span>
              <span v-if="d.isToday" class="semana-badge">HOY</span>
            </div>
            <div class="semana-day__date">{{ d.fecha }}</div>
          </div>

          <div class="semana-day__grid">
            <div class="semana-meal">
              <h3 class="semana-meal__title">Desayuno</h3>
              <div v-for="(it, i) in d.desayuno" :key="i" class="semana-line">
                <strong v-if="it.label">{{ it.label }}:</strong> {{ it.text }}
              </div>
            </div>

            <div class="semana-meal">
              <h3 class="semana-meal__title">Almuerzo</h3>
              <div v-for="(it, i) in d.almuerzo" :key="i" class="semana-line">
                <strong v-if="it.label">{{ it.label }}:</strong> {{ it.text }}
              </div>
            </div>

            <div class="semana-meal">
              <h3 class="semana-meal__title">Once</h3>
              <div v-for="(it, i) in d.once" :key="i" class="semana-line">
                <strong v-if="it.label">{{ it.label }}:</strong> {{ it.text }}
              </div>
            </div>
          </div>
        </section>
      </div>

    </div>
  </div>
</template>
