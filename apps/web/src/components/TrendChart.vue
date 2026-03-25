<script setup lang="ts">
import { computed, ref } from "vue";

type Datum = { label: string; value: number };

const props = defineProps<{
  points?: number[];
  labels?: string[];
  data?: Datum[];
  width?: number;
  height?: number;
  padding?: number;
  yTicks?: number;
  showArea?: boolean;
  compactX?: boolean;
  yUnit?: string;
}>();

const w = computed(() => props.width ?? 920);
const h = computed(() => props.height ?? 250);
const p = computed(() => props.padding ?? 18);
const yTicksCount = computed(() => Math.max(2, props.yTicks ?? 5));
const showArea = computed(() => props.showArea ?? true);
const compactX = computed(() => props.compactX ?? true);

const series = computed<Datum[]>(() => {
  if (props.data?.length) {
    return props.data.map((d) => ({
      label: String(d.label),
      value: Number(d.value) || 0,
    }));
  }
  const pts = (props.points ?? []).map((x) => Number(x) || 0);
  const lbs = (props.labels ?? []).map((x) => String(x));
  return pts.map((v, i) => ({ label: lbs[i] ?? `D${i + 1}`, value: v }));
});

const n = computed(() => series.value.length);
const values = computed(() => series.value.map((d) => d.value));
const minV = computed(() =>
  values.value.length ? Math.min(...values.value) : 0,
);
const maxV = computed(() =>
  values.value.length ? Math.max(...values.value) : 0,
);

const yDomain = computed(() => {
  const min = minV.value;
  const max = maxV.value;

  if (min === max) {
    const pad = Math.max(1, Math.round(max * 0.25));
    return { min: Math.max(0, min - pad), max: max + pad };
  }

  const span = max - min;
  const pad = span * 0.12;

  return {
    min: Math.max(0, Math.floor(min - pad)),
    max: Math.ceil(max + pad),
  };
});

const innerW = computed(() => w.value - p.value * 2);
const chartBottomPadding = computed(() => 34);
const innerH = computed(() => h.value - p.value - chartBottomPadding.value - 6);

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
  return series.value
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(d.value).toFixed(2)}`,
    )
    .join(" ");
});

const areaPath = computed(() => {
  if (!showArea.value || n.value === 0) return "";
  const yBase = scaleY(yDomain.value.min);
  const firstX = scaleX(0);
  const lastX = scaleX(n.value - 1);
  return `${linePath.value} L ${lastX.toFixed(2)} ${yBase.toFixed(2)} L ${firstX.toFixed(2)} ${yBase.toFixed(2)} Z`;
});

const yTicks = computed(() => {
  const k = yTicksCount.value;
  const dMin = yDomain.value.min;
  const dMax = yDomain.value.max;

  const raw: number[] = [];
  for (let i = 0; i < k; i++) {
    const t = k === 1 ? 0 : i / (k - 1);
    raw.push(dMin + t * (dMax - dMin));
  }

  const uniq = Array.from(new Set(raw.map((v) => Math.round(v))));
  return uniq.map((vv) => ({ value: vv, y: scaleY(vv) }));
});

function shouldShowXLabel(i: number) {
  if (!compactX.value) return true;
  if (n.value <= 1) return true;

  const marks = new Set([
    0,
    Math.round((n.value - 1) * 0.25),
    Math.round((n.value - 1) * 0.5),
    Math.round((n.value - 1) * 0.75),
    n.value - 1,
  ]);

  return marks.has(i);
}

const lastIndex = computed(() => (n.value ? n.value - 1 : -1));
const lastValue = computed(() =>
  n.value ? series.value[lastIndex.value].value : 0,
);

const hoverIndex = ref<number | null>(null);
const tipX = computed(() =>
  hoverIndex.value == null ? 0 : scaleX(hoverIndex.value),
);
const tipY = computed(() =>
  hoverIndex.value == null
    ? 0
    : scaleY(series.value[hoverIndex.value]?.value ?? 0),
);

function onMove(e: MouseEvent) {
  if (n.value <= 0) return;

  const svg = e.currentTarget as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * w.value;

  let best = 0;
  let bestDist = Infinity;

  for (let i = 0; i < n.value; i++) {
    const dx = Math.abs(scaleX(i) - mouseX);
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

const tipLabel = computed(() => {
  if (hoverIndex.value == null) return "";
  const d = series.value[hoverIndex.value];
  return `${d.label} • ${d.value}${props.yUnit ? ` ${props.yUnit}` : ""}`;
});
</script>

<template>
  <div class="trend-card">
    <div class="trend-body">
      <div class="trend-chart">
        <svg
          :viewBox="`0 0 ${w} ${h}`"
          class="svg"
          @mousemove="onMove"
          @mouseleave="onLeave"
        >
          <g class="grid">
            <template v-for="(t, idx) in yTicks" :key="idx">
              <line :x1="p" :x2="w - p" :y1="t.y" :y2="t.y" class="grid-line" />
              <text :x="p - 8" :y="t.y + 4" text-anchor="end" class="y-label">
                {{ t.value }}
              </text>
            </template>
          </g>

          <g class="x-axis">
            <template v-for="(d, i) in series" :key="i">
              <text
                v-if="shouldShowXLabel(i)"
                :x="scaleX(i)"
                :y="h - 8"
                text-anchor="middle"
                class="x-label"
              >
                {{ d.label }}
              </text>
            </template>
          </g>

          <path v-if="showArea && areaPath" :d="areaPath" class="area" />
          <path v-if="linePath" :d="linePath" class="line" />

          <g class="points">
            <circle
              v-for="(d, i) in series"
              :key="i"
              :cx="scaleX(i)"
              :cy="scaleY(d.value)"
              :r="hoverIndex === i ? 4.4 : i === lastIndex ? 4.2 : 3"
              :class="[
                'dot',
                hoverIndex === i ? 'dot-active' : '',
                i === lastIndex ? 'dot-last' : '',
              ]"
            />
          </g>

          <g v-if="hoverIndex !== null" class="tooltip">
            <line
              :x1="tipX"
              :x2="tipX"
              :y1="p"
              :y2="h - chartBottomPadding"
              class="tip-line"
            />
            <g
              :transform="`translate(${Math.min(tipX + 10, w - 240)}, ${Math.max(tipY - 28, p)})`"
            >
              <rect width="230" height="26" rx="8" class="tip-box" />
              <text x="10" y="17" class="tip-text">{{ tipLabel }}</text>
            </g>
          </g>
        </svg>
      </div>

      <div class="trend-side">
        <div class="side-head">Últimos {{ n }} días</div>

        <div class="kpi">
          <div class="kpi-label">Último</div>
          <div class="kpi-value">{{ lastValue }}</div>
        </div>

        <div class="range">
          <div class="range-row">
            <span class="range-label">Min</span>
            <span class="range-value">{{ minV }}</span>
          </div>
          <div class="range-row">
            <span class="range-label">Max</span>
            <span class="range-value">{{ maxV }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trend-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.06);
  padding: 12px;
}

.trend-body {
  display: grid;
  grid-template-columns: 1fr 128px;
  gap: 12px;
  align-items: stretch;
}

.trend-chart {
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 8px;
  overflow: hidden;
}

.svg {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 920 / 250;
}

.grid-line {
  stroke: rgba(0, 0, 0, 0.08);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.y-label,
.x-label {
  font-size: 10px;
  fill: #6b7280;
  font-weight: 700;
}

.area {
  fill: rgba(59, 130, 246, 0.1);
}

.line {
  fill: none;
  stroke: rgba(17, 24, 39, 0.85);
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dot {
  fill: rgba(17, 24, 39, 0.85);
  opacity: 0.9;
}

.dot-active,
.dot-last {
  opacity: 1;
}

.trend-side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.side-head {
  font-size: 12px;
  color: #6b7280;
  font-weight: 800;
  text-align: right;
}

.kpi {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 10px;
}

.kpi-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 800;
}

.kpi-value {
  font-size: 24px;
  font-weight: 900;
  color: #111827;
  line-height: 1.1;
  margin-top: 2px;
}

.range {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 10px;
}

.range-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 4px 0;
}

.range-label {
  color: #6b7280;
  font-weight: 800;
}

.range-value {
  font-weight: 900;
  color: #111827;
}

.tip-line {
  stroke: rgba(17, 24, 39, 0.22);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.tip-box {
  fill: rgba(17, 24, 39, 0.92);
}

.tip-text {
  fill: #fff;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .trend-body {
    grid-template-columns: 1fr;
  }

  .trend-side {
    flex-direction: row;
  }

  .side-head {
    text-align: left;
  }

  .svg {
    height: 190px;
  }
}
</style>
