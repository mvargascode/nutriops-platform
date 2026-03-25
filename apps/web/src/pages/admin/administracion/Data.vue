<script setup lang="ts">
import { ref, computed } from "vue";
import * as XLSX from "xlsx";
import { useAuthStore } from "@/stores/auth";
import "@/assets/styles/admin/dataAdmin.css";

type RowIn = Record<string, any>;

type NutriRow = {
  fecha: string; // YYYY-MM-DD
  tipo: 1 | 2 | 3; // 1: Desayuno; 2: Almuerzo; 3: Once
  orden: number; // 1: Principal; 2: Ensalada/Acompañamiento; 3: Postre; 4: Bebestible/Otros
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
const showSummary = ref(true);

function tipoLabel(tipo: number) {
  if (tipo === 1) return "Desayuno";
  if (tipo === 2) return "Almuerzo";
  if (tipo === 3) return "Once";
  return `Tipo ${tipo}`;
}

function summaryDetail(tipo: number, count: number) {
  // Reglas esperadas (puedes ajustar)
  if (tipo === 1) return count === 1 ? "1 ítem" : `${count} ítems`;
  if (tipo === 3) return count === 1 ? "1 ítem" : `${count} ítems`;

  // Almuerzo (tipo 2)
  if (tipo === 2) {
    if (count === 3) return "Principal + Ensalada + Postre";
    if (count === 1) return "Principal";
    if (count === 2) return "Principal + Ensalada";
    if (count === 4) return "Principal + Ensalada + Postre + Otro";
    return `${count} ítems`;
  }

  return `${count} ítems`;
}

const showCount = ref<number>(25);
const preview = computed(() => rows.value.slice(0, showCount.value));

const fileInputRef = ref<HTMLInputElement | null>(null);

/* ---------------------------
   Column resize (drag)
---------------------------- */
const colWidths = ref<number[]>([
  100, // fecha
  70, // tipo
  80, // orden
  280, // item  (antes 360)
  110, // porcion
  70, // kcal
  70, // prot
  90, // grasas
  70, // carbs
  440, // comentario (antes 420)
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

  // Soporta coma decimal (por si Excel viene "12,5")
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

  // Orden debe estar en 1..4 (alineado con backend)
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
    if (v !== null && v < 0)
      errors.value.push(`Fila ${rowNum}: ${k} no puede ser negativo.`);
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
    if (!r.fecha || !r.item?.trim()) continue; // ya lo cubre validateRow
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

const summaryByFechaTipo = computed(() => {
  const map = new Map<string, number>();
  for (const r of rows.value) {
    if (!r.fecha) continue;
    const k = `${r.fecha}|${r.tipo}`;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, count]) => {
      const [fecha, tipo] = k.split("|");
      return { fecha, tipo: Number(tipo), count };
    })
    .sort((a, b) =>
      a.fecha === b.fecha ? a.tipo - b.tipo : a.fecha.localeCompare(b.fecha),
    );
});

const hasWarnings = computed(() => warnings.value.length > 0);
const hasErrors = computed(() => errors.value.length > 0);

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
    for (const k of Object.keys(obj)) out[normalizeHeader(k)] = (obj as any)[k];
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
    "comentarioopcional", // comentario(opcional)
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

    // Fix crítico: NO forzar a 3. Si viene mal, queda como inválido y validateRow lo detecta.
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

  // Duplicados (bloquean importación)
  if (!errors.value.length) {
    addDuplicateErrors(out);
  }

  // Warnings (permitidos, pero se confirma antes de importar)
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
  showCount.value = 25;

  if (clearInput && fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;

  resetImportState(false);

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
}

const canImport = computed(
  () => rows.value.length > 0 && errors.value.length === 0 && !busy.value,
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
    if (!res.ok)
      throw new Error(
        data?.error || data?.message || `Error HTTP ${res.status}`,
      );

    const rowsReceived = data?.rowsReceived ?? rows.value.length;
    const affectedRows = data?.affectedRows ?? null;
    const chunks = data?.chunks ?? null;

    okMsg.value =
      `Importación OK. Filas: ${rowsReceived}` +
      (affectedRows !== null ? ` | affectedRows: ${affectedRows}` : "") +
      (chunks !== null ? ` | chunks: ${chunks}` : "");
  } catch (err: any) {
    errors.value.unshift(err?.message || "Error al importar.");
  } finally {
    busy.value = false;
  }
}
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
          type="file"
          accept=".xlsx,.xls,.csv"
          @change="onFileChange"
        />

        <div class="meta" v-if="fileName">
          Archivo: <strong>{{ fileName }}</strong>
          <span v-if="sheetName"> (Hoja: {{ sheetName }})</span>
        </div>

        <button
          class="btn-cancel"
          type="button"
          :disabled="!canCancel || busy"
          @click="resetImportState(true)"
          title="Limpiar datos cargados y seleccionar otro archivo"
        >
          Cancelar / Limpiar
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

    <div v-if="okMsg" class="msg ok">
      {{ okMsg }}
    </div>

    <div v-if="rows.length" class="preview">
      <div class="preview-head">
        <div>
          <strong>Previsualización</strong>
          <span class="muted"> — Filas detectadas: {{ rows.length }}</span>
        </div>

        <div class="show">
          <label>Mostrar:</label>
          <select v-model="showCount">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="9999">Todas</option>
          </select>
        </div>
      </div>

      <div class="table-wrap">
        <!-- HEADER STICKY SÓLIDO (igual que Usuarios) -->
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

        <!-- BODY -->
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

      <div class="muted" style="margin-top: 8px">
        (Mostrando {{ preview.length }} de {{ rows.length }} filas)
      </div>
    </div>
  </div>
</template>
