<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  guardarNutricion,
  listarNutricion,
  type NutricionItem,
} from "@/api/nutricion";

const hoy = new Date().toISOString().slice(0, 10);
const form = ref<NutricionItem>({
  fecha: hoy,
  tipo: 2,
  orden: 1,
  item: "",
  porcion: "",
  kcal: 0,
});
const lista = ref<NutricionItem[]>([]);
const cargando = ref(true);

async function refrescar() {
  cargando.value = true;
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 14);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  lista.value = await listarNutricion({ desde: fmt(from), hasta: fmt(to) });
  cargando.value = false;
}

async function guardar() {
  await guardarNutricion(form.value);
  await refrescar();
}
function tipoTexto(t: number) {
  return t === 1 ? "Desayuno" : t === 2 ? "Almuerzo" : "Cena";
}

onMounted(refrescar);
</script>

<template>
  <section class="p-4 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Cargar Nutrición</h1>

    <form class="grid gap-3" @submit.prevent="guardar">
      <div class="grid grid-cols-2 gap-2">
        <label class="flex flex-col">
          <span class="text-sm">Fecha</span>
          <input v-model="form.fecha" type="date" class="input" required />
        </label>
        <label class="flex flex-col">
          <span class="text-sm">Tipo</span>
          <select v-model.number="form.tipo" class="input">
            <option :value="1">Desayuno</option>
            <option :value="2">Almuerzo</option>
            <option :value="3">Cena</option>
          </select>
        </label>
      </div>

      <div class="grid grid-cols-6 gap-2">
        <label class="flex flex-col col-span-3">
          <span class="text-sm">Ítem</span>
          <input v-model="form.item" class="input" required />
        </label>
        <label class="flex flex-col col-span-1">
          <span class="text-sm">Orden</span>
          <input
            v-model.number="form.orden"
            type="number"
            min="1"
            class="input"
            required
          />
        </label>
        <label class="flex flex-col col-span-2">
          <span class="text-sm">Porción</span>
          <input v-model="form.porcion" class="input" />
        </label>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <label class="flex flex-col">
          <span class="text-sm">Kcal</span>
          <input
            v-model.number="form.kcal"
            type="number"
            min="0"
            class="input"
          />
        </label>
        <label class="flex flex-col">
          <span class="text-sm">Proteínas (g)</span>
          <input
            v-model.number="form.proteinas_g"
            type="number"
            min="0"
            class="input"
          />
        </label>
        <label class="flex flex-col">
          <span class="text-sm">Grasas (g)</span>
          <input
            v-model.number="form.grasas_g"
            type="number"
            min="0"
            class="input"
          />
        </label>
        <label class="flex flex-col">
          <span class="text-sm">Carbohidratos (g)</span>
          <input
            v-model.number="form.carbohidratos_g"
            type="number"
            min="0"
            class="input"
          />
        </label>
      </div>

      <div class="flex gap-2">
        <button class="btn btn-primary" type="submit">Guardar</button>
      </div>
    </form>

    <hr class="my-6" />

    <div>
      <h2 class="text-xl font-semibold mb-2">Registros recientes</h2>
      <div v-if="cargando">Cargando…</div>
      <table v-else class="w-full text-sm border">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 text-left">Fecha</th>
            <th class="p-2 text-left">Tipo</th>
            <th class="p-2 text-left">Orden</th>
            <th class="p-2 text-left">Ítem</th>
            <th class="p-2 text-left">Kcal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in lista" :key="n.id" class="border-t">
            <td class="p-2">{{ n.fecha }}</td>
            <td class="p-2">{{ tipoTexto(n.tipo) }}</td>
            <td class="p-2">{{ n.orden }}</td>
            <td class="p-2">{{ n.item }}</td>
            <td class="p-2">{{ n.kcal }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.input {
  border: 1px solid #ddd;
  padding: 0.5rem;
  border-radius: 0.375rem;
}
.btn {
  border: 1px solid #ddd;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
}
.btn-primary {
  background: #2e5b9b;
  color: white;
  border-color: #2e5b9b;
}
</style>
