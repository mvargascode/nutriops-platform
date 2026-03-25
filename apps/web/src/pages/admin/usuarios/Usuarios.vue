<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { http, httpUsers } from "@/api/http";
import UserTable from "@/components/users/UserTable.vue";
import UserFormModal from "@/components/users/UserFormModal.vue";
import UserConfirmModal from "@/components/users/UserConfirmModal.vue";
import "@/assets/styles/admin/usuariosAdmin.css";

type Unidad = {
  id: number;
  nombre: string;
};

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

const loading = ref(false);
const error = ref<string | null>(null);

const unidades = ref<Unidad[]>([]);
const usuarios = ref<UsuarioRow[]>([]);

const q = ref<string>("");
const unidadId = ref<string>("");
const statusFilter = ref<StatusFilter>("active");

const limit = ref<number>(50);
const offset = ref<number>(0);
const total = ref<number>(0);

const showUserModal = ref(false);
const userModalMode = ref<"create" | "edit">("create");
const selectedUser = ref<UsuarioRow | null>(null);

const showConfirmModal = ref(false);
const confirmMode = ref<"status" | "delete">("status");
const confirmLoading = ref(false);
const confirmTargetUser = ref<UsuarioRow | null>(null);

// Temporal
const canDelete = computed(() => true);

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1);

const totalPages = computed(() => {
  if (!total.value || limit.value <= 0) return 1;
  return Math.max(1, Math.ceil(total.value / limit.value));
});

const showingText = computed(() => {
  const from = usuarios.value.length ? offset.value + 1 : 0;
  const to = Math.min(offset.value + usuarios.value.length, total.value);

  return `Mostrando ${from}–${to} de ${total.value}`;
});

const unidadSeleccionadaNombre = computed(() => {
  if (!unidadId.value) return "";
  const idNum = Number(unidadId.value);
  return unidades.value.find((u) => u.id === idNum)?.nombre ?? "";
});

const confirmTitle = computed(() => {
  if (!confirmTargetUser.value) return "";

  if (confirmMode.value === "delete") {
    return "Eliminar usuario";
  }

  return confirmTargetUser.value.is_active
    ? "Desactivar usuario"
    : "Activar usuario";
});

const confirmMainMessage = computed(() => {
  if (!confirmTargetUser.value) return "";

  const name = confirmTargetUser.value.nombre;

  if (confirmMode.value === "delete") {
    return `Vas a eliminar al usuario "${name}"`;
  }

  return confirmTargetUser.value.is_active
    ? `¿Deseas desactivar al usuario "${name}"?`
    : `¿Deseas activar al usuario "${name}"?`;
});

const confirmSubMessage = computed(() => {
  if (confirmMode.value === "delete") {
    return "Esta acción no se puede deshacer.";
  }

  return "";
});

const confirmButtonText = computed(() => {
  if (confirmMode.value === "delete") return "Eliminar";
  return confirmTargetUser.value?.is_active ? "Desactivar" : "Activar";
});

const confirmVariant = computed<"warning" | "danger">(() => {
  return confirmMode.value === "delete" ? "danger" : "warning";
});

let t: ReturnType<typeof setTimeout> | null = null;

watch(q, () => {
  if (t) clearTimeout(t);
  t = setTimeout(() => {
    offset.value = 0;
    loadUsers();
  }, 350);
});

watch(unidadId, () => {
  offset.value = 0;
  loadUsers();
});

async function loadUnidades() {
  const { data } = await http.get("/unidades");
  const list = (data?.rows ?? data?.data ?? data) as any[];
  unidades.value = Array.isArray(list) ? list : [];
}

async function loadUsers() {
  loading.value = true;
  error.value = null;

  try {
    const params: any = {
      q: q.value.trim() || undefined,
      unidad_id: unidadId.value ? Number(unidadId.value) : undefined,
      status: statusFilter.value,
      limit: limit.value,
      offset: offset.value,
    };

    const { data } = await httpUsers.get("/", { params });

    usuarios.value = (data?.rows ?? []) as UsuarioRow[];
    total.value = typeof data?.total === "number" ? data.total : 0;
  } catch (e: any) {
    error.value =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible cargar los usuarios.";
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  offset.value = 0;
  await loadUsers();
}

async function nextPage() {
  if (offset.value + limit.value >= total.value) return;
  offset.value += limit.value;
  await loadUsers();
}

async function prevPage() {
  if (offset.value === 0) return;
  offset.value = Math.max(0, offset.value - limit.value);
  await loadUsers();
}

function handleChangeStatusFilter(value: StatusFilter) {
  statusFilter.value = value;
  offset.value = 0;
  loadUsers();
}

function handleLimitChange() {
  offset.value = 0;
  loadUsers();
}

function handleCreateUser() {
  userModalMode.value = "create";
  selectedUser.value = null;
  showUserModal.value = true;
}

function handleEditUser(user: UsuarioRow) {
  userModalMode.value = "edit";
  selectedUser.value = user;
  showUserModal.value = true;
}

function handleToggleStatus(user: UsuarioRow) {
  confirmMode.value = "status";
  confirmTargetUser.value = user;
  showConfirmModal.value = true;
}

function handleDeleteUser(user: UsuarioRow) {
  confirmMode.value = "delete";
  confirmTargetUser.value = user;
  showConfirmModal.value = true;
}

function closeUserModal() {
  showUserModal.value = false;
  selectedUser.value = null;
}

function closeConfirmModal() {
  if (confirmLoading.value) return;

  showConfirmModal.value = false;
  confirmTargetUser.value = null;
}

async function handleConfirmAction() {
  if (!confirmTargetUser.value) return;

  const user = confirmTargetUser.value;
  const mode = confirmMode.value;

  confirmLoading.value = true;
  error.value = null;

  try {
    if (mode === "delete") {
      await httpUsers.delete(`/${user.id}`);
    } else {
      const nextStatus = user.is_active ? 0 : 1;

      await httpUsers.patch(`/${user.id}/status`, {
        is_active: nextStatus,
      });
    }

    // cerrar directo, sin pasar por closeConfirmModal()
    showConfirmModal.value = false;
    confirmTargetUser.value = null;

    // si eliminaste o cambiaste estado del último registro visible, corrige página
    if (usuarios.value.length === 1 && offset.value > 0) {
      offset.value = Math.max(0, offset.value - limit.value);
    }

    await loadUsers();
  } catch (e: any) {
    error.value =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible completar la acción.";
  } finally {
    confirmLoading.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    await loadUnidades();
    await loadUsers();
  } catch (e: any) {
    error.value =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible cargar la vista de usuarios.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="usuarios-card">
    <div class="usuarios-title">
      <h2>Usuarios</h2>
    </div>

    <div class="usuarios-controls">
      <div class="left">
        <button
          class="btn-refresh-user"
          type="button"
          :disabled="loading"
          @click="refresh"
        >
          {{ loading ? "Cargando..." : "Actualizar" }}
        </button>

        <button
          class="btn-create-user"
          type="button"
          :disabled="loading"
          @click="handleCreateUser"
        >
          Nuevo usuario
        </button>
      </div>

      <div class="right">
        <input
          class="usuarios-search"
          type="text"
          v-model="q"
          placeholder="Buscar por RUT o nombre…"
        />

        <select class="usuarios-select" v-model="unidadId">
          <option value="">Todas las unidades</option>
          <option v-for="u in unidades" :key="u.id" :value="String(u.id)">
            {{ u.nombre }}
          </option>
        </select>

        <select
          class="usuarios-select"
          v-model.number="limit"
          @change="handleLimitChange"
        >
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="msg err">
      <strong>Error</strong>
      <div style="margin-top: 6px">{{ error }}</div>
    </div>

    <div v-else-if="loading" class="msg warn">
      <strong>Cargando</strong>
      <div style="margin-top: 6px">Obteniendo usuarios desde la BD…</div>
    </div>

    <UserTable
      v-else
      :usuarios="usuarios"
      :loading="loading"
      :limit="limit"
      :offset="offset"
      :total="total"
      :can-delete="canDelete"
      :status-filter="statusFilter"
      @edit="handleEditUser"
      @toggle-status="handleToggleStatus"
      @delete="handleDeleteUser"
      @next-page="nextPage"
      @prev-page="prevPage"
      @change-status-filter="handleChangeStatusFilter"
    />

    <UserFormModal
      :open="showUserModal"
      :mode="userModalMode"
      :user="selectedUser"
      @close="closeUserModal"
      @saved="refresh"
    />

    <UserConfirmModal
      :open="showConfirmModal"
      :title="confirmTitle"
      :main-message="confirmMainMessage"
      :sub-message="confirmSubMessage"
      :confirm-text="confirmButtonText"
      :variant="confirmVariant"
      :loading="confirmLoading"
      @close="closeConfirmModal"
      @confirm="handleConfirmAction"
    />

    <div v-if="!loading && !error" class="muted usuarios-footer-meta">
      {{ showingText }}
    </div>
  </div>
</template>