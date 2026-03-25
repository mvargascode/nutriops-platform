<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  value: number;
  max: number;
  min?: number;
  title?: string;
  units?: string;
  color?: string;

  // NUEVO: mostrar % junto al valor
  showPercent?: boolean;
}>();

const pct01 = computed(() =>
  props.max ? Math.max(0, Math.min(1, props.value / props.max)) : 0,
);

const pct100 = computed(() => Math.round(pct01.value * 100));

const W = 360;
const P = 18;
const r = 110;
const cx = W / 2;
const cy = r + P;
const H = cy + P;
const halfC = Math.PI * r;

const dashOffset = computed(() => halfC * (1 - pct01.value));

const minValue = computed(() => props.min ?? 0);
const maxValue = computed(() => props.max);

const strokeColor = computed(() => props.color ?? "#64748b");

const fmt = (n: number) => new Intl.NumberFormat("es-CL").format(n);
</script>

<template>
  <div class="gauge">
    <div class="title">{{ title ?? "Capacidad Casino" }}</div>

    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <!-- fondo -->
      <path
        :d="`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`"
        stroke="#e9e9e9"
        stroke-width="22"
        fill="none"
        stroke-linecap="round"
      />

      <!-- valor -->
      <path
        :d="`M ${cx - r},${cy} A ${r},${r} 0 0 1 ${cx + r},${cy}`"
        :stroke="strokeColor"
        stroke-width="22"
        fill="none"
        stroke-linecap="round"
        :stroke-dasharray="halfC"
        :stroke-dashoffset="dashOffset"
        style="transition: stroke-dashoffset .6s ease, stroke .25s ease;"
      />

      <!-- extremos -->
      <text :x="cx - r - 20" :y="cy + 10" font-size="12" fill="#666" text-anchor="start">
        {{ fmt(minValue) }}
      </text>
      <text :x="cx + r + 32" :y="cy + 12" font-size="12" fill="#666" text-anchor="end">
        {{ fmt(maxValue) }}
      </text>

      <!-- valor central -->
      <text :x="cx" :y="cy - 44" font-size="34" font-weight="800" text-anchor="middle" fill="#111">
        {{ fmt(value) }}
      </text>

      <text :x="cx" :y="cy - 22" font-size="14" text-anchor="middle" fill="#9ca3af">
        {{ units ?? "usuarios" }}
      </text>

      <!-- NUEVO: porcentaje -->
      <text
        v-if="showPercent"
        :x="cx"
        :y="cy - 2"
        font-size="18"
        font-weight="900"
        text-anchor="middle"
        :fill="strokeColor"
      >
        {{ pct100 }}%
      </text>
    </svg>
  </div>
</template>

<style scoped>
.gauge {
  display: grid;
  place-items: center;
}
.title {
  margin-bottom: 0.25rem;
  font-weight: 700;
  color: #333;
}
</style>