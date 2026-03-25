<script setup lang="ts">
import { computed } from "vue";
import type { ExecutiveAlert } from "@/types/executive";

const props = defineProps<{
  alerts: ExecutiveAlert[];
  max?: number;
  compact?: boolean;
}>();

const maxItems = computed(() => props.max ?? 3);

const compact = computed(() => props.compact ?? false);

const visible = computed(() => {
  const arr = props.alerts ?? [];
  return arr.slice(0, maxItems.value);
});

function iconFor(severity: ExecutiveAlert["severity"]) {
  if (severity === "critical") return "⛔";
  if (severity === "warning") return "⚠️";
  return "ℹ️";
}

function classFor(severity: ExecutiveAlert["severity"]) {
  if (severity === "critical") return "is-critical";
  if (severity === "warning") return "is-warning";
  return "is-info";
}

function fmtN(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("es-CL").format(n);
}

function fmtPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const r = Math.round(v * 10) / 10;
  return `${r > 0 ? "+" : ""}${r}%`;
}

function hasEvidence(a: ExecutiveAlert) {
  return (
    a.actual !== undefined ||
    a.previous !== undefined ||
    a.delta !== undefined ||
    a.deltaPct !== undefined
  );
}
</script>

<template>
  <section class="alerts">
    <div class="alerts__head">
      <h3>Alertas operacionales</h3>
      <div class="alerts__sub">
        Generadas desde backend (no manipulable en UI)
      </div>
    </div>

    <div v-if="!visible.length" class="alerts__empty">
      Sin alertas relevantes para este corte.
    </div>

    <div v-else class="alerts__list">
      <div
        v-for="a in visible"
        :key="a.code + ':' + (a.metric ?? '-')"
        class="alert"
        :class="classFor(a.severity)"
      >
        <div class="alert__icon">{{ iconFor(a.severity) }}</div>

        <div class="alert__body">
          <div class="alert__title">
            {{ a.title }}
          </div>

          <div class="alert__msg">{{ a.message }}</div>

          <!-- Evidencia (si viene) -->
          <div v-if="!compact && hasEvidence(a)" class="alert__evidence">
            <div class="ev">
              <div class="ev__k">{{ a.actualLabel ?? "Actual" }}</div>
              <div class="ev__v">{{ fmtN(a.actual) }}</div>
            </div>
            <div class="ev">
              <div class="ev__k">{{ a.previousLabel ?? "Anterior" }}</div>
              <div class="ev__v">{{ fmtN(a.previous) }}</div>
            </div>
            <div
              class="ev"
              :class="
                a.delta !== undefined && a.delta !== null
                  ? a.delta > 0
                    ? 'is-up'
                    : a.delta < 0
                      ? 'is-down'
                      : ''
                  : ''
              "
            >
              <div class="ev__k">Δ</div>
              <div class="ev__v">
                {{
                  a.delta === null || a.delta === undefined
                    ? "—"
                    : fmtN(a.delta)
                }}
              </div>
            </div>
            <div
              class="ev"
              :class="
                a.deltaPct !== undefined && a.deltaPct !== null
                  ? a.deltaPct > 0
                    ? 'is-up'
                    : a.deltaPct < 0
                      ? 'is-down'
                      : ''
                  : ''
              "
            >
              <div class="ev__k">Δ%</div>
              <div class="ev__v">{{ fmtPct(a.deltaPct) }}</div>
            </div>
          </div>

          <div class="alert__meta" v-if="a.period?.from && a.period?.to">
            Periodo:
            <b>{{ a.period.from }}</b> → <b>{{ a.period.to }}</b>

            <template v-if="a.prevPeriod?.from && a.prevPeriod?.to">
              · Anterior:
              <b>{{ a.prevPeriod.from }}</b> → <b>{{ a.prevPeriod.to }}</b>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.alerts {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alerts__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.alerts__head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 900;
  color: #111827;
}

.alerts__sub {
  color: #6b7280;
  font-weight: 800;
  font-size: 12px;
}

.alerts__empty {
  text-align: center;
  color: #6b7280;
  font-weight: 700;
  padding: 10px 0;
}

.alerts__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #fafafa;
}

.alert__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 900;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #fff;
}

.alert__title {
  font-weight: 900;
  color: #111827;
  font-size: 13px;
}

.alert__msg {
  margin-top: 2px;
  color: #374151;
  font-weight: 700;
  font-size: 12px;
}

.alert__meta {
  margin-top: 10px;
  color: #6b7280;
  font-weight: 800;
  font-size: 12px;
  opacity: 0.9;
}

.dot {
  margin: 0 6px;
  opacity: 0.7;
}

/* Evidencia */
.alert__evidence {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.ev {
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ev.is-up .ev__v {
  color: #065f46;
}
.ev.is-down .ev__v {
  color: #7f1d1d;
}

.ev__k {
  font-size: 10px;
  font-weight: 900;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ev__v {
  font-size: 13px;
  font-weight: 900;
  color: #111827;
}

/* severity */
.is-info {
  border-color: rgba(59, 130, 246, 0.22);
  background: rgba(59, 130, 246, 0.06);
}
.is-warning {
  border-color: rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.08);
}
.is-critical {
  border-color: rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
}

.meta-row {
  margin-top: 4px;
}
.sep {
  margin: 0 6px;
  opacity: 0.6;
}

@media (max-width: 900px) {
  .alert__evidence {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
