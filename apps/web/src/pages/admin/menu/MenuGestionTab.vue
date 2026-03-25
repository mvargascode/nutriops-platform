<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { deleteMenu, getMenu, updateMenu, type MenuRow } from "@/api/menu";

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const rows = ref<MenuRow[]>([]);

const filters = ref({
  desde: "",
  hasta: "",
  tipo: "",
});

const selectedItem = ref<MenuRow | null>(null);
const showEditModal = ref(false);

const currentPage = ref(1);
const pageSize = 7;

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(rows.value.length / pageSize));
});

const sortedRows = computed(() => {
  return [...rows.value].sort((a, b) => {
    const dateA = new Date(a.fecha).getTime();
    const dateB = new Date(b.fecha).getTime();

    if (dateA !== dateB) {
      return dateB - dateA; // fecha más reciente primero
    }

    return b.id - a.id; // si la fecha es igual, ID más alto primero
  });
});

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return sortedRows.value.slice(start, end);
});

const showDeleteModal = ref(false);
const itemToDelete = ref<MenuRow | null>(null);
const deleting = ref(false);

function openDeleteModal(row: MenuRow) {
  itemToDelete.value = row;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  itemToDelete.value = null;
}

async function confirmDelete() {
  if (!itemToDelete.value) return;

  deleting.value = true;

  try {
    await deleteMenu(itemToDelete.value.id);
    closeDeleteModal();
    await fetchMenu();
  } catch (err) {
    console.error("Error al eliminar:", err);
    window.alert("No se pudo eliminar el registro.");
  } finally {
    deleting.value = false;
  }
}

function getTipoLabel(tipo: number) {
  switch (tipo) {
    case 1:
      return "Desayuno";
    case 2:
      return "Almuerzo";
    case 3:
      return "Once";
    default:
      return `Tipo ${tipo}`;
  }
}

function getOrdenLabel(tipo: number, orden: number) {
  if (tipo === 1) {
    if (orden === 1) return "Preparación";
    return `Bloque ${orden}`;
  }

  if (tipo === 2 || tipo === 3) {
    if (orden === 1) return "Principal";
    if (orden === 2) return "Ensalada/Acomp.";
    if (orden === 3) return "Postre";
    return `Bloque ${orden}`;
  }

  return `Orden ${orden}`;
}

function formatDate(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

async function fetchMenu() {
  loading.value = true;
  error.value = "";

  try {
    const params: {
      tipo?: string;
      desde?: string;
      hasta?: string;
    } = {};

    if (filters.value.tipo) params.tipo = filters.value.tipo;
    if (filters.value.desde) params.desde = filters.value.desde;
    if (filters.value.hasta) params.hasta = filters.value.hasta;

    rows.value = await getMenu(params);
    currentPage.value = 1;
  } catch (err) {
    console.error("Error al cargar menú:", err);
    error.value = "No se pudo cargar la información del menú.";
  } finally {
    loading.value = false;
  }
}

function handleEdit(row: MenuRow) {
  selectedItem.value = { ...row };
  showEditModal.value = true;
}

async function saveEdit() {
  if (!selectedItem.value) return;

  saving.value = true;

  try {
    await updateMenu(selectedItem.value.id, {
      fecha: selectedItem.value.fecha,
      tipo: Number(selectedItem.value.tipo),
      orden: Number(selectedItem.value.orden),
      item: selectedItem.value.item,
      porcion: selectedItem.value.porcion,
      kcal: selectedItem.value.kcal,
      proteinas_g: selectedItem.value.proteinas_g,
      grasas_g: selectedItem.value.grasas_g,
      carbohidratos_g: selectedItem.value.carbohidratos_g,
      comentario: selectedItem.value.comentario,
    });

    showEditModal.value = false;
    selectedItem.value = null;
    await fetchMenu();
  } catch (err) {
    console.error("Error actualizando registro:", err);
    window.alert("No se pudo actualizar el registro.");
  } finally {
    saving.value = false;
  }
}

async function clearFilters() {
  filters.value.desde = "";
  filters.value.hasta = "";
  filters.value.tipo = "";
  await fetchMenu();
}

function goToPreviousPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function goToNextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

onMounted(fetchMenu);
</script>

<template>
  <section class="menu-gestion-tab">
    <div class="filters-card">
      <div class="filters-left">
        <div class="field">
          <label>Desde</label>
          <input v-model="filters.desde" type="date" />
        </div>

        <div class="field">
          <label>Hasta</label>
          <input v-model="filters.hasta" type="date" />
        </div>

        <div class="field">
          <label>Tipo</label>
          <select v-model="filters.tipo">
            <option value="">Todos</option>
            <option value="1">Desayuno</option>
            <option value="2">Almuerzo</option>
            <option value="3">Once</option>
          </select>
        </div>
      </div>

      <div class="filters-right">
        <button class="btn primary" :disabled="loading" @click="fetchMenu">
          Buscar
        </button>

        <button class="btn secondary" :disabled="loading" @click="clearFilters">
          Limpiar
        </button>

        <button class="btn primary" :disabled="loading" @click="fetchMenu">
          Actualizar
        </button>
      </div>
    </div>

    <div v-if="loading" class="state-box">Cargando menú...</div>

    <div v-else-if="error" class="state-box error">
      {{ error }}
    </div>

    <div v-else class="table-card">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Detalle</th>
              <th>Item</th>
              <th>Porción</th>
              <th>Kcal</th>
              <th>Prot.</th>
              <th>Grasas</th>
              <th>Carbs.</th>
              <th>Comentario</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="paginatedRows.length === 0">
              <td colspan="12" class="empty">No hay registros para mostrar.</td>
            </tr>

            <tr v-for="row in paginatedRows" :key="row.id">
              <td>{{ row.id }}</td>
              <td>{{ formatDate(row.fecha) }}</td>
              <td>{{ getTipoLabel(row.tipo) }}</td>
              <td>{{ getOrdenLabel(row.tipo, row.orden) }}</td>
              <td>{{ row.item }}</td>
              <td>{{ row.porcion || "-" }}</td>
              <td>{{ row.kcal ?? "-" }}</td>
              <td>{{ row.proteinas_g ?? "-" }}</td>
              <td>{{ row.grasas_g ?? "-" }}</td>
              <td>{{ row.carbohidratos_g ?? "-" }}</td>
              <td class="comment">{{ row.comentario || "-" }}</td>
              <td>
                <div class="row-actions">
                  <button
                    class="btn edit"
                    :disabled="loading"
                    @click="handleEdit(row)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn delete"
                    :disabled="loading"
                    @click="openDeleteModal(row)"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" v-if="rows.length > 0">
        <button
          class="btn secondary"
          :disabled="currentPage === 1"
          @click="goToPreviousPage"
        >
          Anterior
        </button>

        <span class="pagination-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>

        <button
          class="btn primary"
          :disabled="currentPage === totalPages"
          @click="goToNextPage"
        >
          Siguiente
        </button>
      </div>
    </div>

    <div v-if="showEditModal && selectedItem" class="modal-backdrop">
      <div class="modal-box">
        <h3>Editar registro</h3>

        <div class="modal-grid">
          <div class="field">
            <label>Fecha</label>
            <input v-model="selectedItem.fecha" type="date" />
          </div>

          <div class="field">
            <label>Tipo</label>
            <select v-model.number="selectedItem.tipo">
              <option :value="1">Desayuno</option>
              <option :value="2">Almuerzo</option>
              <option :value="3">Once</option>
            </select>
          </div>

          <div class="field">
            <label>Orden</label>
            <input v-model.number="selectedItem.orden" type="number" min="1" />
          </div>

          <div class="field field-full">
            <label>Item</label>
            <input v-model="selectedItem.item" type="text" />
          </div>

          <div class="field">
            <label>Porción</label>
            <input v-model="selectedItem.porcion" type="text" />
          </div>

          <div class="field">
            <label>Kcal</label>
            <input v-model.number="selectedItem.kcal" type="number" />
          </div>

          <div class="field">
            <label>Proteínas</label>
            <input
              v-model.number="selectedItem.proteinas_g"
              type="number"
              step="0.1"
            />
          </div>

          <div class="field">
            <label>Grasas</label>
            <input
              v-model.number="selectedItem.grasas_g"
              type="number"
              step="0.1"
            />
          </div>

          <div class="field">
            <label>Carbohidratos</label>
            <input
              v-model.number="selectedItem.carbohidratos_g"
              type="number"
              step="0.1"
            />
          </div>

          <div class="field field-full">
            <label>Comentario</label>
            <textarea v-model="selectedItem.comentario" rows="4"></textarea>
          </div>
        </div>

        <div class="row-actions modal-actions">
          <button
            class="btn secondary"
            :disabled="saving"
            @click="
              showEditModal = false;
              selectedItem = null;
            "
          >
            Cancelar
          </button>
          <button class="btn primary" :disabled="saving" @click="saveEdit">
            {{ saving ? "Guardando..." : "Guardar cambios" }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="showDeleteModal && itemToDelete" class="modal-backdrop">
      <div class="modal-box modal-delete">
        <h3>Eliminar registro</h3>

        <p class="delete-text">¿Seguro que deseas eliminar este registro?</p>

        <div class="delete-summary">
          <p><strong>ID:</strong> {{ itemToDelete.id }}</p>
          <p><strong>Fecha:</strong> {{ formatDate(itemToDelete.fecha) }}</p>
          <p><strong>Tipo:</strong> {{ getTipoLabel(itemToDelete.tipo) }}</p>
          <p>
            <strong>Detalle:</strong>
            {{ getOrdenLabel(itemToDelete.tipo, itemToDelete.orden) }}
          </p>
          <p><strong>Item:</strong> {{ itemToDelete.item }}</p>
        </div>

        <div class="row-actions modal-actions">
          <button
            class="btn secondary"
            :disabled="deleting"
            @click="closeDeleteModal"
          >
            Cancelar
          </button>

          <button
            class="btn delete"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? "Eliminando..." : "Sí, eliminar" }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.menu-gestion-tab {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.filters-card,
.table-card,
.state-box {
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--sombra);
  padding: 16px 18px;
}

.filters-card {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  flex-wrap: wrap;
}

.filters-left {
  display: flex;
  gap: 14px;
  align-items: end;
  flex-wrap: wrap;
}

.filters-right {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
  margin-left: auto;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.field label {
  font-size: 13px;
  font-weight: 800;
  color: #374151;
}

.field input,
.field select,
textarea {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
  background: #fff;
  font-family: inherit;
}

.field input,
.field select {
  height: 40px;
}

textarea {
  padding: 12px;
  resize: vertical;
}

.btn {
  height: 36px;
  border: none;
  border-radius: 10px;
  padding: 0 12px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  transition: 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn.primary {
  background: #10106a;
  color: #fff;
}

.btn.secondary {
  background: #ececec;
  color: #222;
}

.btn.edit {
  background: #e7eefc;
  color: #1f3c88;
}

.btn.delete {
  background: #fde8e8;
  color: #b42318;
}

.table-card {
  padding: 10px 12px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  padding: 12px 8px;
  border-bottom: 1px solid #edf0f2;
  text-align: left;
  vertical-align: top;
  font-size: 13px;
}

th {
  font-size: 13px;
  font-weight: 900;
  color: #111827;
  background: #f8fafc;
}

td {
  color: #374151;
  line-height: 1.3;
}

/* ID */
th:nth-child(1),
td:nth-child(1) {
  width: 42px;
  white-space: nowrap;
}

/* Fecha */
th:nth-child(2),
td:nth-child(2) {
  width: 94px;
  white-space: nowrap;
}

/* Tipo */
th:nth-child(3),
td:nth-child(3) {
  width: 92px;
  white-space: nowrap;
}

/* Detalle */
th:nth-child(4),
td:nth-child(4) {
  width: 140px;
  white-space: nowrap;
}

/* Item */
th:nth-child(5),
td:nth-child(5) {
  width: 250px;
  white-space: normal;
  word-break: break-word;
}

/* Porción */
th:nth-child(6),
td:nth-child(6) {
  width: 92px;
  white-space: nowrap;
}

/* Kcal / Prot / Grasas / Carbs */
th:nth-child(7),
td:nth-child(7),
th:nth-child(8),
td:nth-child(8),
th:nth-child(9),
td:nth-child(9),
th:nth-child(10),
td:nth-child(10) {
  width: 70px;
  white-space: nowrap;
  text-align: center;
}

/* Comentario */
th:nth-child(11),
td:nth-child(11) {
  width: 230px;
  white-space: normal;
  word-break: break-word;
}

/* Acciones */
th:nth-child(12),
td:nth-child(12) {
  width: 190px;
  white-space: nowrap;
}

.comment {
  white-space: normal;
  word-break: break-word;
  line-height: 1.3;
}

.row-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
}

.row-actions .btn {
  min-width: 82px;
  justify-content: center;
  text-align: center;
  padding: 0 12px;
  font-size: 13px;
}

.empty {
  text-align: center;
  color: #6b7280;
  padding: 24px;
}

.state-box {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.state-box.error {
  color: #b42318;
  background: #fff1f1;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 14px 4px 2px;
}

.pagination-info {
  font-size: 14px;
  font-weight: 800;
  color: #374151;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.28);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-box {
  background: #fff;
  width: min(520px, 92vw);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  padding: 22px;
}

.modal-box h3 {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 900;
}

.modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.field-full {
  grid-column: 1 / -1;
}

.modal-actions {
  justify-content: flex-end;
  margin-top: 18px;
}

.modal-delete {
  width: min(460px, 92vw);
}

.delete-text {
  margin: 10px 0 16px;
  color: #4b5563;
  font-size: 14px;
}

.delete-summary {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-summary p {
  margin: 0;
  font-size: 14px;
  color: #374151;
}

@media (max-width: 1100px) {
  .filters-card {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-right {
    margin-left: 0;
  }
}

@media (max-width: 900px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }
}
</style>
