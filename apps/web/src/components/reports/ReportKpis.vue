<script setup lang="ts">
import type { ReportKpis } from "@/api/reports";

const props = defineProps<{
  kpis: ReportKpis;
  delta?: {
    total: { abs: number; pct: number | null };
    avg_diario: { abs: number; pct: number | null };
  };
  compare?: { from: string; to: string };
}>();

function sign(n: number) {
  return n > 0 ? "+" : n < 0 ? "−" : "";
}

function fmtDMY(ymd: string) {
  // YYYY-MM-DD -> DD/MM/YYYY
  const p = ymd.split("-");
  if (p.length !== 3) return ymd;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function fmtRange(from: string, to: string) {
  return `${fmtDMY(from)}–${fmtDMY(to)}`;
}

function fmtDelta(abs: number, pct: number | null) {
  // si pct viene null, mostramos solo abs (sin "(—)")
  const a = `${sign(abs)}${Math.abs(abs)}`;
  if (pct === null) return a;
  const p = `${pct > 0 ? "+" : ""}${pct}%`;
  return `${a} (${p})`;
}

function deltaClass(abs: number) {
  if (abs > 0) return "up";
  if (abs < 0) return "down";
  return "flat";
}
</script>

<template>
  <div class="kpi-grid">
    <!-- TOTAL -->
    <div class="kpi-card">
      <div class="kpi-label">TOTAL PORCIONES</div>
      <div class="kpi-value">{{ kpis.total }}</div>

      <div
        v-if="delta && compare"
        class="kpi-sub"
        :class="deltaClass(delta.total.abs)"
        :title="`Periodo anterior (${compare.from}–${compare.to}): ${fmtDelta(delta.total.abs, delta.total.pct)}`"
      >
        Periodo anterior ({{ fmtRange(compare.from, compare.to) }}):
        <b>{{ fmtDelta(delta.total.abs, delta.total.pct) }}</b>
      </div>
    </div>

    <!-- PROMEDIO -->
    <div class="kpi-card">
      <div class="kpi-label">PROMEDIO DIARIO</div>
      <div class="kpi-value">{{ kpis.avg_diario }}</div>

      <div
        v-if="delta && compare"
        class="kpi-sub"
        :class="deltaClass(delta.avg_diario.abs)"
        :title="`Periodo anterior (${compare.from}–${compare.to}): ${fmtDelta(delta.avg_diario.abs, delta.avg_diario.pct)}`"
      >
        Periodo anterior ({{ fmtRange(compare.from, compare.to) }}):
        <b>{{ fmtDelta(delta.avg_diario.abs, delta.avg_diario.pct) }}</b>
      </div>
    </div>

    <!-- PICO -->
    <div class="kpi-card">
      <div class="kpi-label">DÍA PICO</div>
      <div class="kpi-value">
        {{
          kpis.pico
            ? `${fmtDMY(kpis.pico.fecha)} (Total: ${kpis.pico.total})`
            : "—"
        }}
      </div>
      <div class="kpi-sub muted">Día con mayor consumo del rango</div>
    </div>

    <!-- DISTRIBUCIÓN -->
    <div class="kpi-card">
      <div class="kpi-label">DISTRIBUCIÓN</div>

      <div class="kpi-center">
        <div class="kpi-value small">
          Desayuno: {{ kpis.por_tipo["1"] }} · Almuerzo:
          {{ kpis.por_tipo["2"] }} · Cena: {{ kpis.por_tipo["3"] }}
        </div>
        <div class="kpi-sub muted">Totales por tipo en el rango</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kpi-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  min-height: 96px;
}

.kpi-label {
  font-size: 11px;
  font-weight: 800;
  opacity: 0.75;
  letter-spacing: 0.02em;
}

.kpi-value {
  font-size: 22px;
  font-weight: 900;
  margin-top: 6px;
}

.kpi-value.small {
  font-size: 14px;
  font-weight: 800;
}

.kpi-sub {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-sub.muted {
  color: #6b7280;
  font-weight: 700;
}

.kpi-sub.up {
  color: #0f766e;
}
.kpi-sub.down {
  color: #b45309;
}
.kpi-sub.flat {
  color: #6b7280;
}

.kpi-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center; /* centra vertical */
}

@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 650px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
