<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  points: number[];
  width?: number;
  height?: number;
  padding?: number;
  showArea?: boolean;
}>();

const w = computed(() => props.width ?? 920);
const h = computed(() => props.height ?? 90);
const p = computed(() => props.padding ?? 10);
const showArea = computed(() => props.showArea ?? true);

const safe = computed(() => (props.points ?? []).map((x) => Number(x) || 0));
const n = computed(() => safe.value.length);

const minV = computed(() => (safe.value.length ? Math.min(...safe.value) : 0));
const maxV = computed(() => (safe.value.length ? Math.max(...safe.value) : 0));

const yDomain = computed(() => {
  const min = minV.value;
  const max = maxV.value;
  if (min === max) {
    const pad = Math.max(1, Math.round(max * 0.25));
    return { min: Math.max(0, min - pad), max: max + pad };
  }
  const span = max - min;
  const pad = span * 0.12;
  return { min: Math.max(0, Math.floor(min - pad)), max: Math.ceil(max + pad) };
});

const innerW = computed(() => w.value - p.value * 2);
const innerH = computed(() => h.value - p.value * 2);

function scaleX(i: number) {
  if (n.value <= 1) return p.value;
  return p.value + (i / (n.value - 1)) * innerW.value;
}
function scaleY(v: number) {
  const dMin = yDomain.value.min;
  const dMax = yDomain.value.max;
  const t = dMax === dMin ? 0 : (v - dMin) / (dMax - dMin);
  return p.value + (1 - t) * innerH.value;
}

const linePath = computed(() => {
  if (n.value === 0) return "";
  return safe.value
    .map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`)
    .join(" ");
});

const areaPath = computed(() => {
  if (!showArea.value || n.value === 0) return "";
  const yBase = scaleY(yDomain.value.min);
  const firstX = scaleX(0);
  const lastX = scaleX(n.value - 1);
  return `${linePath.value} L ${lastX.toFixed(2)} ${yBase.toFixed(2)} L ${firstX.toFixed(2)} ${yBase.toFixed(2)} Z`;
});

// Tooltip simple (opcional): hover nearest
const hoverIndex = ref<number | null>(null);
function onMove(e: MouseEvent) {
  if (n.value <= 0) return;
  const svg = e.currentTarget as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;

  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < n.value; i++) {
    const dx = Math.abs(scaleX(i) - x);
    if (dx < bestDist) {
      bestDist = dx;
      best = i;
    }
  }
  hoverIndex.value = best;
}
function onLeave() {
  hoverIndex.value = null;
}
</script>

<template>
  <div class="spark-wrap">
    <svg
      :width="w"
      :height="h"
      :viewBox="`0 0 ${w} ${h}`"
      preserveAspectRatio="none"
      class="spark"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <path v-if="showArea && areaPath" :d="areaPath" class="area" />
      <path v-if="linePath" :d="linePath" class="line" />

      <!-- puntos -->
      <circle
        v-for="(v, i) in safe"
        :key="i"
        :cx="scaleX(i)"
        :cy="scaleY(v)"
        :r="hoverIndex === i ? 3.6 : 2.6"
        :class="['dot', hoverIndex === i ? 'dot-active' : '']"
      />
    </svg>
  </div>
</template>

<style scoped>
.spark-wrap {
  background: #f8fafc;
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 12px;
  padding: 8px;
}
.spark {
  width: 100%;
  display: block;
}

.area {
  fill: rgba(59, 130, 246, 0.10);
}

.line {
  fill: none;
  stroke: rgba(17, 24, 39, 0.85);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dot {
  fill: rgba(17, 24, 39, 0.75);
  opacity: 0.9;
}
.dot-active {
  opacity: 1;
}
</style>