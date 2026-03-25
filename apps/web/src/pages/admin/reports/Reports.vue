<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import * as XLSX from "xlsx-js-style";

import ReportFilters from "@/components/reports/ReportFilters.vue";
import ReportKpis from "@/components/reports/ReportKpis.vue";
import ReportCharts from "@/components/reports/ReportCharts.vue";
import ReportTable from "@/components/reports/ReportTable.vue";

import {
  getConsumoReport,
  type ConsumoReportResponse,
  type ReportTipo,
} from "@/api/reports";

// ----------------------
// Estado
// ----------------------
const loading = ref(false);
const error = ref<string | null>(null);

const from = ref(dayjs().subtract(6, "day").format("YYYY-MM-DD"));
const to = ref(dayjs().format("YYYY-MM-DD"));
const tipo = ref<ReportTipo>("all");

const data = ref<ConsumoReportResponse | null>(null);

// ----------------------
// Router / URL state
// ----------------------
const route = useRoute();
const router = useRouter();
const qSyncing = ref(false);

function parseTipo(q: unknown): ReportTipo {
  const v = String(q ?? "all");
  if (v === "1") return 1;
  if (v === "2") return 2;
  if (v === "3") return 3;
  return "all";
}

function parseDate(q: unknown, fallback: string) {
  const v = String(q ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return fallback;
}

function initFromQuery() {
  from.value = parseDate(route.query.from, from.value);
  to.value = parseDate(route.query.to, to.value);
  tipo.value = parseTipo(route.query.tipo);
}

// state -> URL
watch([from, to, tipo], () => {
  if (qSyncing.value) return;

  router.replace({
    query: {
      ...route.query,
      from: from.value,
      to: to.value,
      tipo: String(tipo.value),
    },
  });
});

// URL -> state (pegar link / back-forward)
watch(
  () => route.query,
  (q) => {
    qSyncing.value = true;

    const nf = parseDate(q.from, from.value);
    const nt = parseDate(q.to, to.value);
    const nTipo = parseTipo(q.tipo);

    const changed = nf !== from.value || nt !== to.value || nTipo !== tipo.value;

    from.value = nf;
    to.value = nt;
    tipo.value = nTipo;

    qSyncing.value = false;

    if (changed) fetchReport();
  }
);

// ----------------------
// Computed seguros
// ----------------------
const compare = computed(() => data.value?.compare ?? null);
const delta = computed(() => data.value?.delta ?? null);
const rows = computed(() => data.value?.series_diaria ?? []);
const kpis = computed(() => data.value?.kpis);
const hasData = computed(() => rows.value.length > 0);

const compareMini = computed(() =>
  data.value?.compare
    ? { from: data.value.compare.from, to: data.value.compare.to }
    : undefined
);

const deltaMini = computed(() =>
  data.value?.delta
    ? {
        total: data.value.delta.total,
        avg_diario: data.value.delta.avg_diario,
      }
    : undefined
);

// ----------------------
// Cancelación de requests (UPGRADE PRO)
// ----------------------
let controller: AbortController | null = null;

async function fetchReport() {
  try {
    if (controller) controller.abort();
    controller = new AbortController();

    loading.value = true;
    error.value = null;

    data.value = await getConsumoReport(
      {
        from: from.value,
        to: to.value,
        tipo: tipo.value,
      },
      { signal: controller.signal }
    );
  } catch (e: any) {
    if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;

    error.value = e?.message || "Error cargando reportes.";
    data.value = null;
  } finally {
    loading.value = false;
  }
}

// ----------------------
// Export Excel (PRO + colores)
// ----------------------
function exportExcel() {
  const r = rows.value;
  const k = kpis.value;
  if (!r.length || !k) return;

  const wb = XLSX.utils.book_new();
  const generatedAt = dayjs().format("YYYY-MM-DD HH:mm");

  const BORDER = {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  };

  const sTitle = {
    font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "111827" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const sMeta = {
    font: { bold: true, color: { rgb: "111827" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const sHeader = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1F3A8A" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER,
  };

  const sCell = {
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER,
  };

  const sDate = {
    alignment: { horizontal: "left", vertical: "center" },
    border: BORDER,
  };

  const sZebra = {
    fill: { fgColor: { rgb: "F9FAFB" } },
  };

  const sTotalLabel = {
    font: { bold: true, color: { rgb: "111827" } },
    fill: { fgColor: { rgb: "E5E7EB" } },
    alignment: { horizontal: "left", vertical: "center" },
    border: BORDER,
  };

  const sTotalNum = {
    font: { bold: true, color: { rgb: "111827" } },
    fill: { fgColor: { rgb: "E5E7EB" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER,
  };

  // -------- Hoja Detalle
  const aoa: any[][] = [];
  aoa.push(["REPORTE DE CONSUMO"]);
  aoa.push([`Rango: ${from.value} a ${to.value}`]);
  aoa.push([`Tipo: ${tipo.value === "all" ? "Todos" : tipo.value}`]);
  aoa.push([`Generado: ${generatedAt}`]);
  aoa.push([]);
  aoa.push(["Fecha", "Desayuno", "Almuerzo", "Cena", "Total"]);

  r.forEach((x) => {
    aoa.push([
      x.fecha,
      Number(x.d1 ?? 0),
      Number(x.d2 ?? 0),
      Number(x.d3 ?? 0),
      Number(x.total ?? 0),
    ]);
  });

  aoa.push([]);
  aoa.push([
    "TOTAL",
    Number(k.por_tipo["1"] ?? 0),
    Number(k.por_tipo["2"] ?? 0),
    Number(k.por_tipo["3"] ?? 0),
    Number(k.total ?? 0),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
  ];

  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  ws["!freeze"] = { xSplit: 0, ySplit: 6 };
  ws["!autofilter"] = { ref: "A6:E6" };

  ws["A1"].s = sTitle;
  ["A2", "A3", "A4"].forEach((addr) => {
    if (ws[addr]) ws[addr].s = sMeta;
  });
  ["A6", "B6", "C6", "D6", "E6"].forEach((addr) => {
    if (ws[addr]) ws[addr].s = sHeader;
  });

  const start = 7;
  const end = 6 + r.length;

  for (let row = start; row <= end; row++) {
    const zebra = (row - start) % 2 === 1;

    const dateCell = ws[`A${row}`];
    const b = ws[`B${row}`];
    const c = ws[`C${row}`];
    const dcell = ws[`D${row}`];
    const e = ws[`E${row}`];

    if (dateCell) dateCell.s = { ...sDate, ...(zebra ? sZebra : {}) };
    [b, c, dcell, e].forEach((cell) => {
      if (!cell) return;
      cell.s = { ...sCell, ...(zebra ? sZebra : {}) };
      cell.z = "0";
    });
  }

  const totalRow = end + 2;
  if (ws[`A${totalRow}`]) ws[`A${totalRow}`].s = sTotalLabel;
  ["B", "C", "D", "E"].forEach((col) => {
    const cell = ws[`${col}${totalRow}`];
    if (!cell) return;
    cell.s = sTotalNum;
    cell.z = "0";
  });

  XLSX.utils.book_append_sheet(wb, ws, "Detalle");

  // -------- Hoja KPIs
  const kpiAoA: any[][] = [
    ["KPIs"],
    [`Rango: ${from.value} a ${to.value}`],
    [`Tipo: ${tipo.value === "all" ? "Todos" : tipo.value}`],
    [`Generado: ${generatedAt}`],
    [],
    ["Indicador", "Valor"],
    ["Total porciones", k.total],
    ["Promedio diario", k.avg_diario],
    ["Día pico", k.pico ? `${k.pico.fecha} (${k.pico.total})` : "-"],
    ["Desayuno", k.por_tipo["1"]],
    ["Almuerzo", k.por_tipo["2"]],
    ["Cena", k.por_tipo["3"]],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(kpiAoA);
  ws2["!cols"] = [{ wch: 26 }, { wch: 28 }];
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  ws2["A1"].s = sTitle;
  ["A6", "B6"].forEach((addr) => (ws2[addr].s = sHeader));

  for (let row = 6; row <= 12; row++) {
    const a = ws2[`A${row}`];
    const b = ws2[`B${row}`];
    if (a) a.s = { ...a.s, border: BORDER, alignment: { vertical: "center" } };
    if (b) b.s = { ...b.s, border: BORDER, alignment: { vertical: "center" } };
  }

  XLSX.utils.book_append_sheet(wb, ws2, "KPIs");

  const name = `Reporte_Consumo_${from.value}_a_${to.value}.xlsx`;
  XLSX.writeFile(wb, name);
}

// ----------------------
// Init
// ----------------------
onMounted(() => {
  initFromQuery();
  fetchReport();
});
</script>

<template>
  <div class="reports-page">
    <div class="reports-title">
      <h2>Reportes</h2>
      <p>Consumo por rango de fechas, KPIs y gráficos.</p>
    </div>

    <!-- FILTROS -->
    <ReportFilters
      v-model:from="from"
      v-model:to="to"
      v-model:tipo="tipo"
      :loading="loading"
      @submit="fetchReport"
      @export="exportExcel"
    />

    <!-- ERROR -->
    <p v-if="error" class="rep-error">{{ error }}</p>

    <!-- LOADING: skeleton simple -->
    <div v-if="loading" class="rep-skeleton">
      <div class="sk sk-kpis"></div>
      <div class="sk sk-charts"></div>
      <div class="sk sk-table"></div>
    </div>

    <!-- CONTENT -->
    <template v-else>
      <!-- KPIs -->
      <ReportKpis
        v-if="kpis && hasData"
        :kpis="kpis"
        :compare="compareMini"
        :delta="deltaMini"
      />

      <!-- VACÍO -->
      <div v-if="kpis && !hasData" class="rep-empty">
        <div class="rep-empty__title">Sin resultados</div>
        <div class="rep-empty__text">
          No hay consumos en el rango seleccionado. Prueba con otro rango o cambia el tipo.
        </div>
      </div>

      <!-- GRÁFICOS -->
      <ReportCharts v-if="kpis && hasData" :series="rows" :kpis="kpis" />

      <!-- TABLA -->
      <ReportTable v-if="hasData" :rows="rows" :loading="false" />
    </template>
  </div>
</template>

<style scoped>
.reports-page {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reports-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-top: 4px;
}

.reports-title h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #111827;
  letter-spacing: 0.2px;
}

.reports-title p {
  margin: 0;
  color: #6b7280;
  font-weight: 600;
}

.reports-title::after {
  content: "";
  width: min(420px, 86%);
  height: 1px;
  background: rgba(17, 24, 39, 0.08);
  margin-top: 8px;
}

.rep-error {
  margin: 0;
  color: #b91c1c;
  font-weight: 800;
}

/* ---- Skeleton ---- */
.rep-skeleton {
  display: grid;
  gap: 12px;
}

.sk {
  background: linear-gradient(
    90deg,
    rgba(17, 24, 39, 0.06),
    rgba(17, 24, 39, 0.1),
    rgba(17, 24, 39, 0.06)
  );
  background-size: 200% 100%;
  animation: sk 1.2s ease-in-out infinite;
  border-radius: 12px;
  box-shadow: var(--sombra);
}

.sk-kpis {
  height: 92px;
}
.sk-charts {
  height: 280px;
}
.sk-table {
  height: 220px;
}

@keyframes sk {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ---- Empty ---- */
.rep-empty {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 18px;
  text-align: center;
}

.rep-empty__title {
  font-weight: 900;
  color: #111827;
  font-size: 16px;
}

.rep-empty__text {
  margin-top: 6px;
  color: #6b7280;
  font-weight: 600;
  font-size: 13px;
}
</style>