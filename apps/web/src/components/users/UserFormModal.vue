<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { httpUsers, http } from "@/api/http";

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

type Mode = "create" | "edit";

const props = defineProps<{
  open: boolean;
  mode: Mode;
  user?: UsuarioRow | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const unidades = ref<Unidad[]>([]);

const form = reactive({
  rut: "",
  nombre: "",
  unidad: "",
  email: "",
  username: "",
  password: "",
  rol: "User",
  is_active: 1,
});

const isEdit = computed(() => props.mode === "edit");
const requiresAccess = computed(
  () =>
    form.rol === "Admin" ||
    form.rol === "Nutricion" ||
    form.rol === "RRHH",
);

const modalTitle = computed(() =>
  isEdit.value ? "Editar usuario" : "Nuevo usuario",
);

const modalSubtitle = computed(() =>
  isEdit.value
    ? "Actualiza la información del usuario seleccionado."
    : "Completa los campos para registrar un nuevo usuario.",
);

const submitText = computed(() =>
  loading.value
    ? isEdit.value
      ? "Guardando..."
      : "Creando..."
    : isEdit.value
      ? "Guardar cambios"
      : "Crear usuario",
);

function resetForm() {
  form.rut = "";
  form.nombre = "";
  form.unidad = "";
  form.email = "";
  form.username = "";
  form.password = "";
  form.rol = "User";
  form.is_active = 1;
  error.value = null;
}

function fillFormFromUser(user: UsuarioRow | null | undefined) {
  if (!user) {
    resetForm();
    return;
  }

  form.rut = user.rut ?? "";
  form.nombre = user.nombre ?? "";
  form.unidad = user.unidad_id != null ? String(user.unidad_id) : "";
  form.email = user.email ?? "";
  form.username = user.username ?? "";
  form.password = "";
  form.rol = user.rol ?? "User";
  form.is_active = Number(user.is_active) === 0 ? 0 : 1;
  error.value = null;
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;

    error.value = null;

    if (!unidades.value.length) {
      await loadUnidades();
    }

    if (isEdit.value) {
      fillFormFromUser(props.user);
    } else {
      resetForm();
    }
  },
);

watch(
  () => props.user,
  (user) => {
    if (props.open && isEdit.value) {
      fillFormFromUser(user);
    }
  },
);

watch(
  () => form.rol,
  (rol) => {
    if (rol === "User") {
      form.username = "";
      form.password = "";
    }
  },
);

async function loadUnidades() {
  try {
    const { data } = await http.get("/unidades");
    const list = (data?.rows ?? data?.data ?? data) as Unidad[];
    unidades.value = Array.isArray(list) ? list : [];
  } catch (e: any) {
    error.value =
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible cargar las unidades.";
  }
}

function buildCreatePayload() {
  return {
    rut: form.rut.trim(),
    nombre: form.nombre.trim(),
    unidad: form.unidad ? Number(form.unidad) : null,
    email: form.email.trim() || null,
    username: requiresAccess.value ? form.username.trim() || null : null,
    password: requiresAccess.value ? form.password : "",
    rol: form.rol,
  };
}

function buildEditPayload() {
  const payload: Record<string, any> = {
    unidad: form.unidad ? Number(form.unidad) : null,
    email: form.email.trim() || null,
    username: requiresAccess.value ? form.username.trim() || null : null,
    rol: form.rol,
    is_active: Number(form.is_active),
  };

  if (requiresAccess.value && form.password.trim()) {
    payload.password = form.password;
  }

  return payload;
}

function validateForm() {
  if (!form.rut.trim() && !isEdit.value) {
    error.value = "El RUT es obligatorio.";
    return false;
  }

  if (!form.nombre.trim() && !isEdit.value) {
    error.value = "El nombre es obligatorio.";
    return false;
  }

  if (isEdit.value && !props.user?.id) {
    error.value = "No se encontró el usuario a editar.";
    return false;
  }

  if (!form.rol.trim()) {
    error.value = "Debes seleccionar un rol.";
    return false;
  }

  if (!isEdit.value && requiresAccess.value) {
    if (!form.username.trim()) {
      error.value = "El username es obligatorio para usuarios con acceso.";
      return false;
    }

    if (!form.password.trim()) {
      error.value = "La contraseña es obligatoria para usuarios con acceso.";
      return false;
    }
  }

  if (isEdit.value && requiresAccess.value && !form.username.trim()) {
    error.value = "El username es obligatorio para usuarios con acceso.";
    return false;
  }

  return true;
}

async function handleSubmit() {
  error.value = null;

  if (!validateForm()) return;

  loading.value = true;

  try {
    if (isEdit.value) {
      await httpUsers.patch(`/${props.user!.id}`, buildEditPayload());
    } else {
      await httpUsers.post("/", buildCreatePayload());
    }

    emit("saved");
    emit("close");
  } catch (e: any) {
    error.value =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.response?.data?.error ??
      e?.message ??
      "No fue posible guardar el usuario.";
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  if (loading.value) return;
  emit("close");
}
</script>

<template>
  <div v-if="open" class="user-modal-overlay" @click.self="handleClose">
    <div class="user-modal">
      <div class="user-modal-header">
        <div class="user-modal-header-text">
          <h3>{{ modalTitle }}</h3>
          <p>{{ modalSubtitle }}</p>
        </div>

        <button
          type="button"
          class="user-modal-close"
          :disabled="loading"
          @click="handleClose"
          aria-label="Cerrar modal"
        >
          ✕
        </button>
      </div>

      <div class="user-modal-body">
        <div v-if="error" class="user-form-alert">
          <strong>Error</strong>
          <span>{{ error }}</span>
        </div>

        <form class="user-form" @submit.prevent="handleSubmit">
          <div class="user-form-grid">
            <div class="field">
              <label for="rut">RUT</label>
              <input
                id="rut"
                v-model="form.rut"
                type="text"
                placeholder="Ej: 12345678-9"
                :disabled="loading || isEdit"
              />
            </div>

            <div class="field">
              <label for="nombre">Nombre</label>
              <input
                id="nombre"
                v-model="form.nombre"
                type="text"
                placeholder="Nombre completo"
                :disabled="loading || isEdit"
              />
            </div>

            <div class="field">
              <label for="unidad">Unidad</label>
              <select id="unidad" v-model="form.unidad" :disabled="loading">
                <option value="">Sin unidad</option>
                <option v-for="u in unidades" :key="u.id" :value="String(u.id)">
                  {{ u.nombre }}
                </option>
              </select>
            </div>

            <div class="field">
              <label for="rol">Rol</label>
              <select id="rol" v-model="form.rol" :disabled="loading">
                <option value="Admin">Admin</option>
                <option value="Nutricion">Nutricion</option>
                <option value="RRHH">RRHH</option>
                <option value="User">User</option>
              </select>
            </div>

            <div class="field">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="correo@dominio.cl"
                :disabled="loading"
              />
            </div>

            <div class="field" v-if="requiresAccess">
              <label for="username">Username</label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                placeholder="usuario.login"
                :disabled="loading"
              />
            </div>

            <div
              class="field"
              :class="{ 'field-span-2': !isEdit }"
              v-if="requiresAccess"
            >
              <label for="password">
                {{ isEdit ? "Nueva contraseña (opcional)" : "Contraseña" }}
              </label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                :placeholder="
                  isEdit ? 'Solo si deseas cambiarla' : 'Contraseña inicial'
                "
                :disabled="loading"
              />
            </div>

            <div class="field" v-if="isEdit">
              <label for="estado">Estado</label>
              <select
                id="estado"
                v-model.number="form.is_active"
                :disabled="loading"
              >
                <option :value="1">Activo</option>
                <option :value="0">Inactivo</option>
              </select>
            </div>
          </div>

          <div class="user-modal-actions">
            <button
              type="button"
              class="btn-secondary"
              :disabled="loading"
              @click="handleClose"
            >
              Cancelar
            </button>

            <button type="submit" class="btn-primary" :disabled="loading">
              {{ submitText }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(4px);
}

.user-modal {
  width: min(860px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
}

.user-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px 18px;
  border-bottom: 1px solid #eef0f3;
}

.user-modal-header-text h3 {
  margin: 0;
  font-size: 2.2rem;
  line-height: 1.1;
  font-weight: 800;
  color: #111827;
}

.user-modal-header-text p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 1.4rem;
  line-height: 1.45;
}

.user-modal-close {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid #d7dbe2;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
}

.user-modal-body {
  padding: 22px 28px 26px;
  overflow-y: auto;
}

.user-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field-span-2 {
  grid-column: span 2;
}

.field label {
  font-size: 1.43rem;
  font-weight: 700;
  color: #374151;
}

.field input,
.field select {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #d7dbe2;
  background: #fff;
  outline: none;
  font-size: 14px;
  color: #111827;
  box-sizing: border-box;
}

.field input::placeholder {
  color: #9ca3af;
}

.field input:focus,
.field select:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

.field input:disabled,
.field select:disabled {
  background: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.user-form-alert {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 14px;
}

.user-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
}

.btn-primary,
.btn-secondary {
  min-width: 150px;
  height: 46px;
  padding: 0 18px;
  border-radius: 14px;
  font-size: 1.3rem;
  font-weight: 800;
  cursor: pointer;
}

.btn-primary {
  border: none;
  background: #1d4ed8;
  color: #fff;
}

.btn-secondary {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #111827;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .user-modal-overlay {
    padding: 14px;
  }

  .user-modal {
    width: 100%;
    max-height: calc(100vh - 28px);
    border-radius: 18px;
  }

  .user-modal-header,
  .user-modal-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .user-modal-header {
    padding-top: 18px;
    padding-bottom: 14px;
  }

  .user-modal-header-text h3 {
    font-size: 1.35rem;
  }

  .user-form-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: span 1;
  }

  .user-modal-actions {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>