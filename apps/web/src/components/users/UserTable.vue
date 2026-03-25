<script setup lang="ts">
import { computed, ref } from "vue";
import UserStatusBadge from "./UserStatusBadge.vue";

type UsuarioRow = {
  id: number;
  rut: string | null;
  nombre: string;
  unidad_id: number | null;
  unidad_nombre?: string | null;
  email: string | null;
  username?: string | null;
  rol: string;
  is_active: number;
  created_at: string | null;
};

type StatusFilter = "active" | "inactive" | "all";

const props = defineProps<{
  usuarios: UsuarioRow[];
  loading?: boolean;
  limit: number;
  offset: number;
  total: number;
  canDelete?: boolean;
  statusFilter: StatusFilter;
}>();

const emit = defineEmits<{
  (e: "edit", user: UsuarioRow): void;
  (e: "toggle-status", user: UsuarioRow): void;
  (e: "delete", user: UsuarioRow): void;
  (e: "next-page"): void;
  (e: "prev-page"): void;
  (e: "change-status-filter", value: StatusFilter): void;
}>();

type ColKind = "px" | "fr";

const colKinds: ColKind[] = ["px", "fr", "fr", "fr", "px", "px", "px", "px"];

const colPx = ref<number[]>([
  130, // RUT
  110, // Rol
  110, // Estado
  170, // Creado
  260, // Acciones
]);

const colFr = ref<number[]>([
  1.5, // Nombre
  1.6, // Unidad
  1.3, // Email
]);

function frIndexFromCol(i: number) {
  if (i === 1) return 0;
  if (i === 2) return 1;
  if (i === 3) return 2;
  return -1;
}

function pxIndexFromCol(i: number) {
  if (i === 0) return 0;
  if (i === 4) return 1;
  if (i === 5) return 2;
  if (i === 6) return 3;
  if (i === 7) return 4;
  return -1;
}

const MIN_PX = 70;
const MAX_PX = 420;
const MIN_FR = 0.7;
const MAX_FR = 3;

const colTemplate = computed(() => {
  return [
    `${colPx.value[0]}px`,
    `minmax(0, ${colFr.value[0]}fr)`,
    `minmax(0, ${colFr.value[1]}fr)`,
    `minmax(0, ${colFr.value[2]}fr)`,
    `${colPx.value[1]}px`,
    `${colPx.value[2]}px`,
    `${colPx.value[3]}px`,
    `${colPx.value[4]}px`,
  ].join(" ");
});

const currentPage = computed(() => Math.floor(props.offset / props.limit) + 1);

const totalPages = computed(() => {
  if (!props.total || props.limit <= 0) return 1;
  return Math.max(1, Math.ceil(props.total / props.limit));
});

const fromRecord = computed(() => {
  if (props.total === 0) return 0;
  return props.offset + 1;
});

const toRecord = computed(() => {
  return Math.min(props.offset + props.usuarios.length, props.total);
});

const canGoNext = computed(() => {
  return props.offset + props.limit < props.total;
});

const canGoPrev = computed(() => {
  return props.offset > 0;
});

function startResize(colIndex: number, ev: PointerEvent) {
  ev.preventDefault();
  ev.stopPropagation();

  const startX = ev.clientX;
  const kind = colKinds[colIndex];

  if (kind === "px") {
    const pxIdx = pxIndexFromCol(colIndex);
    if (pxIdx === -1) return;

    const initial = colPx.value[pxIdx];

    const onMove = (moveEv: PointerEvent) => {
      const delta = moveEv.clientX - startX;
      const next = Math.min(MAX_PX, Math.max(MIN_PX, initial + delta));
      colPx.value[pxIdx] = next;
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return;
  }

  const frIdx = frIndexFromCol(colIndex);
  if (frIdx === -1) return;

  const initial = colFr.value[frIdx];

  const onMove = (moveEv: PointerEvent) => {
    const delta = moveEv.clientX - startX;
    const next = Math.min(MAX_FR, Math.max(MIN_FR, initial + delta / 240));
    colFr.value[frIdx] = Number(next.toFixed(2));
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRoleClass(role: string) {
  switch (role) {
    case "Admin":
      return "pill-admin";
    case "User":
      return "pill-user";
    case "RRHH":
      return "pill-rrhh";
    case "Nutricion":
      return "pill-nutricion";
    default:
      return "";
  }
}
</script>

<template>
  <div class="usuarios-preview">
    <div class="preview-head">
      <div class="preview-title">
        <strong>Listado</strong>
        <span class="muted"> — Usuarios del sistema</span>
      </div>

      <div class="preview-tools">
        <select
          class="status-select"
          :value="statusFilter"
          @change="
            emit(
              'change-status-filter',
              ($event.target as HTMLSelectElement).value as StatusFilter,
            )
          "
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </select>

        <div class="pager-info">
          <span>{{ fromRecord }}–{{ toRecord }} de {{ total }}</span>
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
        </div>

        <div class="pager">
          <button
            class="btn-pager"
            type="button"
            :disabled="loading || !canGoPrev"
            @click="emit('prev-page')"
          >
            ◀
          </button>

          <button
            class="btn-pager"
            type="button"
            :disabled="loading || !canGoNext"
            @click="emit('next-page')"
          >
            ▶
          </button>
        </div>
      </div>
    </div>

    <div class="usuarios-wrap">
      <div class="usuarios-sticky">
        <div
          class="usuarios-table head"
          :style="{ gridTemplateColumns: colTemplate }"
        >
          <div class="th-resizable">
            RUT
            <span
              class="resize-handle"
              @pointerdown="startResize(0, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Nombre
            <span
              class="resize-handle"
              @pointerdown="startResize(1, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Unidad
            <span
              class="resize-handle"
              @pointerdown="startResize(2, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Email
            <span
              class="resize-handle"
              @pointerdown="startResize(3, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Rol
            <span
              class="resize-handle"
              @pointerdown="startResize(4, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Estado
            <span
              class="resize-handle"
              @pointerdown="startResize(5, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Creado
            <span
              class="resize-handle"
              @pointerdown="startResize(6, $event)"
            ></span>
          </div>

          <div class="th-resizable">
            Acciones
            <span
              class="resize-handle"
              @pointerdown="startResize(7, $event)"
            ></span>
          </div>
        </div>
      </div>

      <div
        v-for="u in usuarios"
        :key="u.id"
        class="usuarios-table row"
        :style="{ gridTemplateColumns: colTemplate }"
      >
        <div class="mono">{{ u.rut ?? "—" }}</div>

        <div class="bold cell-ellipsis" :title="u.nombre">
          {{ u.nombre }}
        </div>

        <div class="cell-ellipsis" :title="u.unidad_nombre ?? '—'">
          {{ u.unidad_nombre ?? "—" }}
        </div>

        <div class="cell-ellipsis" :title="u.email ?? '—'">
          {{ u.email ?? "—" }}
        </div>

        <div class="pill" :class="getRoleClass(u.rol)">
          {{ u.rol }}
        </div>

        <div>
          <UserStatusBadge :is-active="u.is_active" />
        </div>

        <div class="mono">{{ formatDate(u.created_at) }}</div>

        <div class="acciones-cell">
          <button
            class="btn-action btn-edit"
            type="button"
            @click="emit('edit', u)"
          >
            Editar
          </button>

          <button
            class="btn-action btn-status"
            type="button"
            @click="emit('toggle-status', u)"
          >
            {{ u.is_active ? "Desactivar" : "Activar" }}
          </button>

          <button
            v-if="canDelete"
            class="btn-action btn-delete"
            type="button"
            @click="emit('delete', u)"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div v-if="usuarios.length === 0" class="empty">
        Sin resultados con los filtros actuales.
      </div>
    </div>
  </div>
</template>
