<script setup lang="ts">
import { computed, ref, watch } from "vue";
import dayjs from "dayjs";
import type { ReportTipo } from "@/api/reports";

const props = defineProps<{
  from: string;
  to: string;
  tipo: ReportTipo;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:from", v: string): void;
  (e: "update:to", v: string): void;
  (e: "update:tipo", v: ReportTipo): void;
  (e: "submit"): void;
  (e: "export"): void;
  (e: "exportPdf"): void;
}>();

const localFrom = ref(props.from);
const localTo = ref(props.to);
const localTipo = ref<ReportTipo>(props.tipo);

// sync props -> local
watch(() => props.from, (v) => (localFrom.value = v));
watch(() => props.to, (v) => (localTo.value = v));
watch(() => props.tipo, (v) => (localTipo.value = v));

const error = computed(() => {
  if (!localFrom.value || !localTo.value) return "Selecciona un rango de fechas.";
  if (dayjs(localFrom.value).isAfter(dayjs(localTo.value)))
    return "La fecha 'Desde' no puede ser mayor a 'Hasta'.";
  return "";
});
const isValid = computed(() => !error.value);

// ---- debounce submit (SIEMPRE) ----
let t: number | null = null;

function debouncedSubmit() {
  if (!isValid.value) return;
  if (props.loading) return;

  if (t) window.clearTimeout(t);
  t = window.setTimeout(() => {
    emit("submit");
  }, 350);
}

function applyLocal() {
  emit("update:from", localFrom.value);
  emit("update:to", localTo.value);
  emit("update:tipo", localTipo.value);
}

function onChangeAny() {
  applyLocal();
  debouncedSubmit();
}

// Presets
function setRange(from: string, to: string) {
  localFrom.value = from;
  localTo.value = to;
  applyLocal();
  debouncedSubmit();
}

function setHoy() {
  const d = dayjs().format("YYYY-MM-DD");
  setRange(d, d);
}
function setLast7() {
  const to = dayjs().format("YYYY-MM-DD");
  const from = dayjs().subtract(6, "day").format("YYYY-MM-DD");
  setRange(from, to);
}
function setLast30() {
  const to = dayjs().format("YYYY-MM-DD");
  const from = dayjs().subtract(29, "day").format("YYYY-MM-DD");
  setRange(from, to);
}
function setThisMonth() {
  const from = dayjs().startOf("month").format("YYYY-MM-DD");
  const to = dayjs().endOf("month").format("YYYY-MM-DD");
  setRange(from, to);
}

const activePreset = computed(() => {
  const f = localFrom.value;
  const t2 = localTo.value;
  if (!f || !t2) return "";

  const today = dayjs().format("YYYY-MM-DD");
  if (f === today && t2 === today) return "hoy";

  const l7From = dayjs().subtract(6, "day").format("YYYY-MM-DD");
  if (f === l7From && t2 === today) return "l7";

  const l30From = dayjs().subtract(29, "day").format("YYYY-MM-DD");
  if (f === l30From && t2 === today) return "l30";

  const mFrom = dayjs().startOf("month").format("YYYY-MM-DD");
  const mTo = dayjs().endOf("month").format("YYYY-MM-DD");
  if (f === mFrom && t2 === mTo) return "mes";

  return "";
});
</script>

<template>
  <div class="rep-filters">
    <!-- Presets -->
    <div class="rep-presets">
      <div class="chips">
        <button class="chip" :class="{ active: activePreset === 'hoy' }" :disabled="loading" @click="setHoy">
          Hoy
        </button>
        <button class="chip" :class="{ active: activePreset === 'l7' }" :disabled="loading" @click="setLast7">
          Últimos 7 días
        </button>
        <button class="chip" :class="{ active: activePreset === 'l30' }" :disabled="loading" @click="setLast30">
          Últimos 30 días
        </button>
        <button class="chip" :class="{ active: activePreset === 'mes' }" :disabled="loading" @click="setThisMonth">
          Este mes
        </button>
      </div>

      <!-- Estado carga (opcional, se ve pro y evita “¿está haciendo algo?”) -->
      <div class="loading-pill" v-if="loading">Actualizando…</div>
    </div>

    <div class="rep-filters__row">
      <div class="rep-field">
        <label>Desde</label>
        <input type="date" v-model="localFrom" @change="onChangeAny" />
      </div>

      <div class="rep-field">
        <label>Hasta</label>
        <input type="date" v-model="localTo" @change="onChangeAny" />
      </div>

      <div class="rep-field">
        <label>Tipo</label>
        <select v-model="localTipo" @change="onChangeAny">
          <option value="all">Todos</option>
          <option :value="1">Desayuno</option>
          <option :value="2">Almuerzo</option>
          <option :value="3">Cena</option>
        </select>
      </div>

      <div class="rep-actions">
        <button
          class="btn btn-secondary"
          :disabled="!isValid || loading"
          @click="emit('export')"
        >
          Exportar Excel
        </button>
      </div>
    </div>

    <p v-if="error" class="rep-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.rep-filters {
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: var(--sombra);
}

/* Presets row */
.rep-presets {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chip {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.04s ease, background 0.15s ease, border 0.15s ease;
}
.chip:hover { transform: translateY(-1px); }
.chip.active {
  border-color: rgba(16, 16, 106, 0.35);
  background: rgba(16, 16, 106, 0.08);
}
.chip:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.loading-pill{
  height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fafafa;
  color: #374151;
  font-weight: 800;
  font-size: 12px;
}

/* Main row */
.rep-filters__row {
  display: grid;
  grid-template-columns: 220px 220px 220px 1fr;
  gap: 12px;
  align-items: end;
}

.rep-field label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #1f2937;
}
.rep-field input,
.rep-field select {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  padding: 0 10px;
  font-size: 14px;
}

.rep-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  height: 40px;
  border-radius: 10px;
  border: 0;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
}
.btn-secondary { background: #eef2ff; color: #111827; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

.rep-error {
  margin: 10px 0 0;
  font-size: 13px;
  color: #b91c1c;
  font-weight: 600;
}

@media (max-width: 980px) {
  .rep-filters__row { grid-template-columns: 1fr 1fr; }
  .rep-actions { justify-content: stretch; }
  .rep-actions .btn { flex: 1; }
}
</style>