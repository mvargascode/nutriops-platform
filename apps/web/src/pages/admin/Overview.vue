<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import dayjs from "dayjs";
import { getExecutiveSummary } from "@/api/executive";
import type { ExecutiveSummaryResponse } from "@/types/executive";

import ExecutiveAlerts from "@/components/executive/ExecutiveAlerts.vue";
import TrendChart from "@/components/TrendChart.vue";

function yyyyMMdd(d: dayjs.Dayjs) {
  return d.format("YYYY-MM-DD");
}

const today = dayjs();

const loading = ref(false);
const error = ref<string | null>(null);
const data = ref<ExecutiveSummaryResponse | null>(null);

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 10) / 10}%`;
}

function badgeForPct(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return "neutral";
  if (pct > 0) return "up";
  if (pct < 0) return "down";
  return "neutral";
}

const refDate = computed(() => data.value?.refDate ?? yyyyMMdd(today));

const kHoy = computed(() => data.value?.today?.total ?? 0);
const week = computed(() => data.value?.week);
const month = computed(() => data.value?.month);

const dist = computed(() => data.value?.distributionToday);
const trend = computed(() => data.value?.trend30d ?? []);
const alerts = computed(() => data.value?.alerts ?? []);

const lastUpdated = computed(() => refDate.value);

// Solo últimos 10 puntos
const trendTail = computed(() => {
  const arr = trend.value;
  if (arr.length <= 10) return arr;
  return arr.slice(arr.length - 10);
});

const trendPoints = computed(() => trendTail.value.map((d) => d.total));

const trendLabels = computed(() =>
  trendTail.value.map((d) =>
    new Date(d.date).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    }),
  ),
);

async function fetchExecutive() {
  try {
    loading.value = true;
    error.value = null;

    const res = await getExecutiveSummary({ date: refDate.value });
    data.value = res;

    // Déjalo mientras pruebas; luego lo quitas.
    console.log(JSON.stringify(res, null, 2));
  } catch (e: any) {
    error.value = e?.message || "Error cargando Executive Summary.";
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchExecutive);
</script>

<template>
  <div class="ov-page">

    <p v-if="error" class="ov-error">{{ error }}</p>

    <div v-if="loading" class="ov-skeleton">
      <div class="sk sk-kpis"></div>
      <div class="sk sk-chart"></div>
      <div class="sk sk-mini"></div>
    </div>

    <template v-else>
      <section class="ov-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Total Hoy</div>
            <div class="kpi-sub">{{ data?.today?.date ?? refDate }}</div>
          </div>
          <div class="kpi-value">{{ kHoy }}</div>
          <div class="kpi-foot">
            (Vista rápida) — detalle completo en <b>Reportes</b>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Total Semana</div>
            <div class="kpi-sub">
              {{ week?.from ?? "—" }} → {{ week?.to ?? "—" }}
            </div>
          </div>
          <div class="kpi-value">{{ week?.total ?? 0 }}</div>
          <div class="kpi-foot">
            Variación vs semana anterior:
            <span class="badge" :class="badgeForPct(week?.deltaPct ?? null)">
              {{ formatPct(week?.deltaPct ?? null) }}
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Total Mes</div>
            <div class="kpi-sub">
              {{ month?.from ?? "—" }} → {{ month?.to ?? "—" }}
            </div>
          </div>
          <div class="kpi-value">{{ month?.total ?? 0 }}</div>
          <div class="kpi-foot">
            Variación vs mes anterior:
            <span class="badge" :class="badgeForPct(month?.deltaPct ?? null)">
              {{ formatPct(month?.deltaPct ?? null) }}
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <div class="kpi-label">Distribución Hoy</div>
            <div class="kpi-sub">Des / Alm / Cena</div>
          </div>

          <div class="kpi-split">
            <div class="kpi-split__item">
              <div class="kpi-split__n">{{ dist?.desayuno ?? 0 }}</div>
              <div class="kpi-split__t">Desayuno</div>
            </div>
            <div class="kpi-split__item">
              <div class="kpi-split__n">{{ dist?.almuerzo ?? 0 }}</div>
              <div class="kpi-split__t">Almuerzo</div>
            </div>
            <div class="kpi-split__item">
              <div class="kpi-split__n">{{ dist?.cena ?? 0 }}</div>
              <div class="kpi-split__t">Cena</div>
            </div>
          </div>
        </div>
      </section>

      <section class="ov-block">
        <div class="ov-block__head">
          <h3>Tendencia (últimos días)</h3>
          <div class="ov-block__sub">Vista analítica</div>
        </div>

        <div v-if="!trendTail.length" class="ov-empty">
          Sin datos de tendencia disponibles.
        </div>

        <TrendChart
          v-else
          :points="trendPoints"
          :labels="trendLabels"
          yUnit="consumos"
          :showArea="true"
          :compactX="true"
          :height="230"
          :padding="18"
        />

      </section>

      <ExecutiveAlerts :alerts="alerts" :max="3" :compact="true" />
    </template>
  </div>
</template>

<style scoped>
.ov-page {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ov-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-top: 4px;
}

.ov-title h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #111827;
  letter-spacing: 0.2px;
}

.ov-title p {
  margin: 0;
  color: #6b7280;
  font-weight: 600;
}

.ov-updated {
  margin-top: 2px;
  color: #374151;
  font-weight: 800;
  font-size: 12px;
  opacity: 0.85;
}

.ov-title::after {
  content: "";
  width: min(460px, 86%);
  height: 1px;
  background: rgba(17, 24, 39, 0.08);
  margin-top: 8px;
}

.ov-error {
  margin: 0;
  color: #b91c1c;
  font-weight: 800;
}

.ov-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
}

.kpi-label {
  font-weight: 900;
  color: #111827;
  font-size: 13px;
}

.kpi-sub {
  color: #6b7280;
  font-weight: 700;
  font-size: 11px;
}

.kpi-value {
  font-size: 30px;
  font-weight: 900;
  color: #111827;
  line-height: 1;
}

.kpi-foot {
  color: #374151;
  font-weight: 700;
  font-size: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 12px;
  margin-left: 6px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #111827;
}
.badge.up {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.25);
  color: #065f46;
}
.badge.down {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.25);
  color: #7f1d1d;
}
.badge.neutral {
  background: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.2);
  color: #374151;
}

.kpi-split {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.kpi-split__item {
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  background: #fafafa;
}
.kpi-split__n {
  font-weight: 900;
  font-size: 18px;
  color: #111827;
}
.kpi-split__t {
  margin-top: 2px;
  font-weight: 800;
  font-size: 11px;
  color: #6b7280;
}

.ov-block {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 14px;
}

.ov-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.ov-block__head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #111827;
}
.ov-block__sub {
  color: #6b7280;
  font-weight: 800;
  font-size: 12px;
}

.ov-empty {
  text-align: center;
  color: #6b7280;
  font-weight: 700;
  padding: 14px 0;
}

.ov-skeleton {
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
  height: 120px;
}
.sk-chart {
  height: 220px;
}
.sk-mini {
  height: 180px;
}

.spark-period {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  margin-top: 6px;
}

@keyframes sk {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1100px) {
  .ov-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .ov-grid {
    grid-template-columns: 1fr;
  }
}
</style>
