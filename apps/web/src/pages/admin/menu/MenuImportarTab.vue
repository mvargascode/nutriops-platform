<script setup lang="ts">
import { ref, computed, watch } from "vue";
import * as XLSX from "xlsx";
import { useAuthStore } from "@/stores/auth";
import "@/assets/styles/admin/dataAdmin.css";

type RowIn = Record<string, any>;

type NutriRow = {
  fecha: string;
  tipo: 1 | 2 | 3;
  orden: number;
  item: string;
  porcion: string;
  kcal: number | null;
  proteinas_g: number | null;
  grasas_g: number | null;
  carbohidratos_g: number | null;
  comentario?: string | null;
};

const auth = useAuthStore();

const fileName = ref<string>("");
const sheetName = ref<string>("");
const rows = ref<NutriRow[]>([]);
const errors = ref<string[]>([]);
const warnings = ref<string[]>([]);
const busy = ref(false);
const okMsg = ref<string>("");

const toastVisible = ref(false);
const toastType = ref<"success" | "error" | "warning">("success");
let toastTimer: number | null = null;

const importFinished = ref(false);

function showToast(
  message: string,
  type: "success" | "error" | "warning" = "success",
) {
  okMsg.value = message;
  toastType.value = type;
  toastVisible.value = true;

  if (toastTimer) window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toastVisible.value = false;
  }, 3500);
}

function closeToast() {
  toastVisible.value = false;
  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
}

const pageSize = ref<number>(6);
const currentPage = ref<number>(1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(rows.value.length / pageSize.value)),
);

const preview = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return rows.value.slice(start, end);
});

const startRow = computed(() => {
  if (!rows.value.length) return 0;
  return (currentPage.value - 1) * pageSize.value + 1;
});

const endRow = computed(() => {
  if (!rows.value.length) return 0;
  return Math.min(currentPage.value * pageSize.value, rows.value.length);
});

function goToPrevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function goToNextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

const fileInputRef = ref<HTMLInputElement | null>(null);

function triggerFilePicker() {
  if (busy.value) return;
  fileInputRef.value?.click();
}

/* ---------------------------
   Column resize (drag)
---------------------------- */
const colWidths = ref<number[]>([
  100, // fecha
  70, // tipo
  80, // orden
  280, // item
  110, // porcion
  70, // kcal
  70, // prot
  90, // grasas
  70, // carbs
  440, // comentario
]);
const MIN_COL_W = 60;

function startResize(colIndex: number, ev: PointerEvent) {
  ev.preventDefault();
  ev.stopPropagation();

  const startX = ev.clientX;
  const startW = colWidths.value[colIndex] ?? 120;

  const handleEl = ev.currentTarget as HTMLElement | null;
  handleEl?.setPointerCapture?.(ev.pointerId);

  const onMove = (e: PointerEvent) => {
    const dx = e.clientX - startX;
    const nextW = Math.max(MIN_COL_W, startW + dx);
    const next = colWidths.value.slice();
    next[colIndex] = nextW;
    colWidths.value = next;
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

/* ---------------------------
   Helpers
---------------------------- */
function normalizeHeader(h: string) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "");
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;

  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toISODate(v: any): string | null {
  if (v === null || v === undefined) return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d?.y && d?.m && d?.d) {
      const yyyy = d.y;
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function validateRow(r: NutriRow, idx: number) {
  const rowNum = idx + 2;

  if (!r.fecha) errors.value.push(`Fila ${rowNum}: fecha inválida o vacía.`);

  if (!(r.tipo === 1 || r.tipo === 2 || r.tipo === 3)) {
    errors.value.push(
      `Fila ${rowNum}: tipo debe ser 1 (desayuno), 2 (almuerzo) o 3 (once).`,
    );
  }

  if (!Number.isFinite(r.orden) || r.orden < 1 || r.orden > 4) {
    errors.value.push(`Fila ${rowNum}: orden inválido (debe ser 1..4).`);
  }

  if (!r.item?.trim()) errors.value.push(`Fila ${rowNum}: item vacío.`);
  if (!r.porcion?.trim()) errors.value.push(`Fila ${rowNum}: porcion vacía.`);

  const nums: Array<[string, number | null]> = [
    ["kcal", r.kcal],
    ["proteinas_g", r.proteinas_g],
    ["grasas_g", r.grasas_g],
    ["carbohidratos_g", r.carbohidratos_g],
  ];

  for (const [k, v] of nums) {
    if (v !== null && v < 0) {
      errors.value.push(`Fila ${rowNum}: ${k} no puede ser negativo.`);
    }
  }
}

/* ---------------------------
   Prevención de errores humanos
---------------------------- */
function uniqueKey(r: NutriRow) {
  return `${r.fecha}|${r.tipo}|${r.orden}|${(r.item ?? "")
    .trim()
    .toLowerCase()}`;
}

function addDuplicateErrors(out: NutriRow[]) {
  const seen = new Map<string, number>();

  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    if (!r.fecha || !r.item?.trim()) continue;

    const key = uniqueKey(r);
    if (seen.has(key)) {
      const first = seen.get(key)!;
      errors.value.push(
        `Fila ${i + 2}: duplicado de la fila ${first + 2} (mismo fecha/tipo/orden/item).`,
      );
    } else {
      seen.set(key, i);
    }
  }
}

const hasWarnings = computed(() => warnings.value.length > 0);

function parseSheet(json: RowIn[]) {
  rows.value = [];
  errors.value = [];
  warnings.value = [];
  okMsg.value = "";

  if (!json.length) {
    errors.value.push("El archivo no trae filas.");
    return;
  }

  const normalized = json.map((obj) => {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj)) out[normalizeHeader(k)] = obj[k];
    return out;
  });

  const required = [
    "fecha",
    "tipo",
    "orden",
    "item",
    "porcion",
    "kcal",
    "proteinas_g",
    "grasas_g",
    "carbohidratos_g",
    "comentarioopcional",
  ];

  const present = new Set(Object.keys(normalized[0] || {}));
  const missing = required.filter((c) => !present.has(c));
  if (missing.length) {
    errors.value.push(
      `Faltan columnas: ${missing.join(", ")}. Revisa que el Excel use exactamente esos encabezados.`,
    );
    return;
  }

  const out: NutriRow[] = normalized.map((r) => {
    const fecha = toISODate(r.fecha) ?? "";
    const tipoN = Number(String(r.tipo ?? "").trim());
    const tipo = tipoN as 1 | 2 | 3;
    const orden = Number(String(r.orden ?? "").trim());
    const com = String(r.comentarioopcional ?? "").trim();

    return {
      fecha,
      tipo,
      orden,
      item: String(r.item ?? "").trim(),
      porcion: String(r.porcion ?? "").trim(),
      kcal: toNum(r.kcal),
      proteinas_g: toNum(r.proteinas_g),
      grasas_g: toNum(r.grasas_g),
      carbohidratos_g: toNum(r.carbohidratos_g),
      comentario: com ? com : null,
    };
  });

  out.forEach((r, i) => validateRow(r, i));

  if (!errors.value.length) {
    addDuplicateErrors(out);
  }

  if (!errors.value.length) {
    const nNullMacros = out.filter(
      (r) =>
        r.proteinas_g === null &&
        r.grasas_g === null &&
        r.carbohidratos_g === null,
    ).length;

    if (nNullMacros > 0) {
      warnings.value.push(
        `Hay ${nNullMacros} filas con macros vacías (prot/grasas/carbs). Esto es permitido, pero quedará NULL en BD.`,
      );
    }
  }

  rows.value = out;
}

function resetImportState(clearInput = true) {
  fileName.value = "";
  sheetName.value = "";
  rows.value = [];
  errors.value = [];
  warnings.value = [];
  okMsg.value = "";
  pageSize.value = 6;
  currentPage.value = 1;
  importFinished.value = false;
  toastVisible.value = false;

  if (toastTimer) {
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }

  if (clearInput && fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;

  resetImportState(false);
  currentPage.value = 1;
  importFinished.value = false;

  fileName.value = f.name;

  const buf = await f.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const found =
    wb.SheetNames.find((n) => n.trim().toLowerCase() === "datos") ??
    wb.SheetNames[0];

  sheetName.value = found;

  const ws = wb.Sheets[found];
  const json = XLSX.utils.sheet_to_json<RowIn>(ws, { defval: "" });

  if (found.trim().toLowerCase() !== "datos") {
    warnings.value.push(`Hoja detectada: "${found}".`);
  }

  parseSheet(json);
  currentPage.value = 1;
}

const canImport = computed(
  () =>
    rows.value.length > 0 &&
    errors.value.length === 0 &&
    !busy.value &&
    !importFinished.value,
);

const canCancel = computed(() => !!fileName.value || rows.value.length > 0);

function confirmProceedWithWarnings() {
  if (!hasWarnings.value) return true;

  const sample = warnings.value.slice(0, 3);
  const msg =
    `Hay ${warnings.value.length} advertencia(s):\n\n` +
    sample.map((w) => `- ${w}`).join("\n") +
    (warnings.value.length > 3 ? "\n- (más...)" : "") +
    `\n\n¿Deseas importar igual?`;

  return confirm(msg);
}

async function importToApi() {
  if (!canImport.value) return;
  if (!confirmProceedWithWarnings()) return;

  busy.value = true;
  okMsg.value = "";
  errors.value = [];

  try {
    const res = await fetch("/api/nutricion/diaria/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      },
      body: JSON.stringify({ rows: rows.value }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.error || data?.message || `Error HTTP ${res.status}`,
      );
    }

    showToast("Importación OK", "success");
    importFinished.value = true;
  } catch (err: any) {
    const errorMsg = err?.message || "Error al importar.";
    errors.value.unshift(errorMsg);
    showToast(errorMsg, "error");
  } finally {
    busy.value = false;
  }
}

watch(pageSize, () => {
  currentPage.value = 1;
});
</script>

<template>
  <div class="data-card">
    <div class="data-title">
      <h2>Cargar Menú — Importar Excel</h2>
    </div>

    <div class="data-controls">
      <div class="left">
        <input
          ref="fileInputRef"
          class="file-input-hidden"
          type="file"
          accept=".xlsx,.xls,.csv"
          @change="onFileChange"
        />

        <button
          class="btn-file"
          type="button"
          :disabled="busy"
          @click="triggerFilePicker"
        >
          {{ fileName ? "Cambiar archivo" : "Seleccionar archivo" }}
        </button>

        <div class="file-chip" :class="{ empty: !fileName }">
          <span class="file-chip-label">
            {{ fileName || "Ningún archivo seleccionado" }}
          </span>
          <span v-if="sheetName" class="file-chip-sheet">
            Hoja: {{ sheetName }}
          </span>
        </div>

        <button
          class="btn-cancel"
          type="button"
          :disabled="!canCancel || busy"
          @click="resetImportState(true)"
          title="Limpiar datos cargados y seleccionar otro archivo"
        >
          Limpiar
        </button>
      </div>

      <button
        class="btn-import"
        type="button"
        :disabled="!canImport"
        @click="importToApi"
      >
        {{ busy ? "Importando..." : "Importar a BD" }}
      </button>
    </div>

    <div v-if="warnings.length" class="msg warn">
      <strong>Warnings</strong>
      <ul>
        <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      </ul>
    </div>

    <div v-if="errors.length" class="msg err">
      <strong>Errores</strong>
      <ul>
        <li v-for="(er, i) in errors.slice(0, 12)" :key="i">{{ er }}</li>
      </ul>
      <div v-if="errors.length > 12" class="muted">
        (Mostrando 12 de {{ errors.length }})
      </div>
    </div>

    <div v-if="rows.length && !importFinished" class="preview">
      <div class="preview-head">
        <div>
          <strong>Previsualización</strong>
          <span class="muted"> — Filas detectadas: {{ rows.length }}</span>
        </div>

        <div class="show">
          <label>Mostrar:</label>
          <select v-model="pageSize">
            <option :value="6">6</option>
            <option :value="12">12</option>
            <option :value="18">18</option>
            <option :value="24">24</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <div class="data-sticky">
          <table class="admin-tbl admin-head">
            <colgroup>
              <col
                v-for="(w, i) in colWidths"
                :key="i"
                :style="{ width: w + 'px' }"
              />
            </colgroup>

            <thead>
              <tr>
                <th class="th-resizable">
                  Fecha
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(0, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Tipo
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(1, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Orden
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(2, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Item
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(3, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Porción
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(4, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Kcal
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(5, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Prot
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(6, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Grasas
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(7, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Carbs
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(8, $event)"
                  ></span>
                </th>
                <th class="th-resizable">
                  Comentario
                  <span
                    class="resize-handle"
                    @pointerdown="startResize(9, $event)"
                  ></span>
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div class="data-body">
          <table class="admin-tbl admin-body">
            <colgroup>
              <col
                v-for="(w, i) in colWidths"
                :key="i"
                :style="{ width: w + 'px' }"
              />
            </colgroup>

            <tbody>
              <tr v-for="(r, i) in preview" :key="i">
                <td class="td-fecha">{{ r.fecha }}</td>
                <td>{{ r.tipo }}</td>
                <td>{{ r.orden }}</td>
                <td>{{ r.item }}</td>
                <td>{{ r.porcion }}</td>
                <td>{{ r.kcal ?? "" }}</td>
                <td>{{ r.proteinas_g ?? "" }}</td>
                <td>{{ r.grasas_g ?? "" }}</td>
                <td>{{ r.carbohidratos_g ?? "" }}</td>
                <td>{{ r.comentario ?? "" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="table-pagination" v-if="rows.length">
        <button
          class="page-btn"
          type="button"
          @click="goToPrevPage"
          :disabled="currentPage === 1"
        >
          Anterior
        </button>

        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>

        <button
          class="page-btn"
          type="button"
          @click="goToNextPage"
          :disabled="currentPage === totalPages"
        >
          Siguiente
        </button>
      </div>

      <div class="muted" style="margin-top: 8px">
        (Mostrando {{ startRow }}–{{ endRow }} de {{ rows.length }} filas)
      </div>
    </div>
  </div>

  <div
    v-if="toastVisible"
    class="toast"
    :class="{
      success: toastType === 'success',
      error: toastType === 'error',
      warning: toastType === 'warning',
    }"
  >
    <div class="toast-body">
      <span class="toast-icon">
        {{ toastType === "success" ? "✓" : toastType === "error" ? "!" : "⚠" }}
      </span>

      <div class="toast-content">
        <strong class="toast-title">
          {{
            toastType === "success"
              ? "Éxito"
              : toastType === "error"
                ? "Error"
                : "Advertencia"
          }}
        </strong>
        <span class="toast-message">{{ okMsg }}</span>
      </div>

      <button class="toast-close" type="button" @click="closeToast">×</button>
    </div>
  </div>
</template>