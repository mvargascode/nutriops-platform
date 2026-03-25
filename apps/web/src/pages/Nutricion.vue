<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getNutricionHoy, type NutricionItem, type TipoComida } from '@/api/casino';

const tipo = ref<TipoComida>(2);
const loading = ref(false);
const error = ref<string|null>(null);
const items = ref<NutricionItem[]>([]);
const fecha = ref<string>('');

async function load(){
  loading.value = true; error.value=null;
  try{ const d = await getNutricionHoy(tipo.value); fecha.value=d.fecha; items.value=d.items??[]; }
  catch(e:any){ error.value=e?.message??'Error'; }
  finally{ loading.value=false; }
}
onMounted(load);
</script>

<template>
  <section style="max-width:900px;margin:24px auto;padding:12px">
    <header style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
      <h2 style="margin:0">Información nutricional</h2>
      <select v-model.number="tipo" @change="load">
        <option :value="1">Desayuno</option>
        <option :value="2">Almuerzo</option>
        <option :value="3">Cena</option>
      </select>
      <small v-if="fecha">Fecha: {{ fecha }}</small>
    </header>

    <div v-if="loading">Cargando…</div>
    <div v-else-if="error">⚠️ {{ error }}</div>
    <table v-else style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th>Ítem</th><th>Porción</th><th>Kcal</th>
          <th>Prot (g)</th><th>Grasa (g)</th><th>Carbs (g)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r,i) in items" :key="i">
          <td>{{ r.item }}</td><td>{{ r.porcion }}</td><td>{{ r.kcal }}</td>
          <td>{{ r.proteinas_g }}</td><td>{{ r.grasas_g }}</td><td>{{ r.carbohidratos_g }}</td>
        </tr>
        <tr v-if="!items.length"><td colspan="6" style="text-align:center;opacity:.7">Sin datos hoy</td></tr>
      </tbody>
    </table>
  </section>
</template>
