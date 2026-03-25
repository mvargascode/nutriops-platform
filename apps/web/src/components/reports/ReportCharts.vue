<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import type { ConsumoDiaRow, ReportKpis } from "@/api/reports";

const props = defineProps<{
  series: ConsumoDiaRow[];
  kpis: ReportKpis;
}>();

function fmtDate(d: string) {
  // YYYY-MM-DD -> DD/MM
  const [y, m, day] = d.split("-");
  return `${day}/${m}`;
}

const hasData = computed(() => (props.series?.length ?? 0) > 0);

const xLabels = computed(() => props.series.map((r) => r.fecha));
const xLabelsShort = computed(() => props.series.map((r) => fmtDate(r.fecha)));

const totalLine = computed(() => props.series.map((r) => Number(r.total ?? 0)));
const d1 = computed(() => props.series.map((r) => Number(r.d1 ?? 0)));
const d2 = computed(() => props.series.map((r) => Number(r.d2 ?? 0)));
const d3 = computed(() => props.series.map((r) => Number(r.d3 ?? 0)));

const optionMain = computed(() => {
  const rotate = props.series.length > 14 ? 45 : 0;

  return {
    grid: { left: 50, right: 20, top: 40, bottom: 70 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(20,20,30,.95)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: (items: any[]) => {
        // items incluye series stacked + line
        const idx = items?.[0]?.dataIndex ?? 0;
        const fecha = xLabels.value[idx] ?? "";
        const a = d1.value[idx] ?? 0;
        const b = d2.value[idx] ?? 0;
        const c = d3.value[idx] ?? 0;
        const t = totalLine.value[idx] ?? 0;

        return `
          <div style="font-weight:700;margin-bottom:6px;">${fecha}</div>
          <div>Desayuno: <b>${a}</b></div>
          <div>Almuerzo: <b>${b}</b></div>
          <div>Cena: <b>${c}</b></div>
          <div style="margin-top:6px;border-top:1px solid rgba(255,255,255,.2);padding-top:6px;">
            Total: <b>${t}</b>
          </div>
        `;
      },
    },
    legend: {
      top: 6,
      left: 8,
      itemWidth: 14,
      itemHeight: 10,
      textStyle: { fontSize: 12 },
      data: ["Desayuno", "Almuerzo", "Cena", "Total"],
    },
    xAxis: {
      type: "category",
      data: xLabelsShort.value,
      axisLabel: { rotate, fontSize: 11 },
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 11 },
      splitLine: { lineStyle: { opacity: 0.2 } },
    },
    dataZoom:
      props.series.length > 14
        ? [
            { type: "inside", start: 0, end: 100 },
            { type: "slider", height: 18, bottom: 40, start: 0, end: 100 },
          ]
        : [],
    series: [
      // Stacked bars
      {
        name: "Desayuno",
        type: "bar",
        stack: "consumo",
        barMaxWidth: 26,
        emphasis: { focus: "series" },
        data: d1.value,
      },
      {
        name: "Almuerzo",
        type: "bar",
        stack: "consumo",
        barMaxWidth: 26,
        emphasis: { focus: "series" },
        data: d2.value,
      },
      {
        name: "Cena",
        type: "bar",
        stack: "consumo",
        barMaxWidth: 26,
        emphasis: { focus: "series" },
        data: d3.value,
      },

      // Total line on top
      {
        name: "Total",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 3 },
        emphasis: { focus: "series" },
        data: totalLine.value,
      },
    ],
  };
});

const donutData = computed(() => {
  const p = props.kpis?.por_tipo ?? { "1": 0, "2": 0, "3": 0 };
  return [
    { name: "Desayuno", value: Number(p["1"] ?? 0) },
    { name: "Almuerzo", value: Number(p["2"] ?? 0) },
    { name: "Cena", value: Number(p["3"] ?? 0) },
  ];
});

const optionDonut = computed(() => {
  const total = donutData.value.reduce((a, b) => a + (b.value || 0), 0);

  return {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(20,20,30,.95)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: (p: any) => {
        const v = p?.value ?? 0;
        const pct = total ? Math.round((v / total) * 100) : 0;
        return `${p?.name}: <b>${v}</b> (${pct}%)`;
      },
    },
    legend: { bottom: 0, left: "center", textStyle: { fontSize: 12 } },
    graphic:
      total === 0
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: "Sin datos",
                fill: "#888",
                fontSize: 14,
                fontWeight: 600,
              },
            },
          ]
        : [],
    series: [
      {
        name: "Distribución",
        type: "pie",
        radius: ["55%", "75%"],
        avoidLabelOverlap: true,
        label: { show: true, formatter: "{b}: {c}" },
        labelLine: { show: true },
        data: donutData.value,
      },
    ],
  };
});
</script>

<template>
  <div class="report-charts-grid">
    <div class="chart-card">
      <div class="chart-title">Consumo por día</div>
      <div v-if="!hasData" class="chart-empty">
        Sin datos para el rango seleccionado.
      </div>
      <VChart v-else class="chart" :option="optionMain" autoresize />
    </div>

    <div class="chart-card">
      <div class="chart-title">Distribución por tipo</div>
      <VChart v-if="hasData" class="chart" :option="optionMain" autoresize />
    </div>
  </div>
</template>

<style scoped>
.report-charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); /* ✅ evita overflow */
  gap: 16px;
}
.chart-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 14px;
  min-height: 320px;
  min-width: 0;         /* ✅ CLAVE para que el card no se “ensanche” */
  overflow: hidden;     /* ✅ por si el canvas se pasa */
}
.chart {
  width: 100%;
  height: 280px;
  min-width: 0;         /* ✅ */
}
.chart-title {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 8px;
  color: #1f2937;
}
.chart-empty {
  height: 280px;
  display: grid;
  place-items: center;
  color: #6b7280;
  font-weight: 600;
}
@media (max-width: 1100px) {
  .report-charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
