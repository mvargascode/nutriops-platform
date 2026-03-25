<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAforoActual, getAforoHoy } from '@/api/casino';

const loading = ref(true);
const error = ref<string | null>(null);

const aforoTotal = ref(160);
const hoyTotal = ref(0);
const desayuno = ref(0);
const almuerzo = ref(0);
const cena = ref(0);

onMounted(async () => {
    try {
        const [{ aforo_total }, resumen] = await Promise.all([
            getAforoActual(),
            getAforoHoy() as Promise<{ fecha:string; detalle:{tipo:1|2|3; cantidad:number}[]; total:number }>
        ]);
        aforoTotal.value = aforo_total ?? 0;
        hoyTotal.value = resumen.total ?? 0;
        desayuno.value = resumen.detalle.find(d => d.tipo === 1)?.cantidad ?? 0;
        almuerzo.value = resumen.detalle.find(d => d.tipo === 2)?.cantidad ?? 0;
        cena.value = resumen.detalle.find(d => d.tipo === 3)?.cantidad ?? 0;
    } catch (e:any) {
        error.value = e?.message ?? 'Error inesperado';
    } finally {
        loading.value = false;
    }
});

const porcentaje = () => {
    if (!aforoTotal.value) return 0;
    const p = Math.round((hoyTotal.value / aforoTotal.value) * 100);
    return Math.max(0, Math.min(100, p));
};
</script>

<template>
  <div class="card">
    <div v-if="loading">Cargando aforo...</div>
    <div v-else-if="error">⚠️ {{ error }}</div>
    <div v-else>
      <header class="header">
        <h3>Aforo del Día</h3>
        <span class="pill">{{ hoyTotal }} / {{ aforoTotal }}</span>
      </header>

      <div class="bar">
        <div class="fill" :style="{ width: porcentaje() + '%' }"></div>
      </div>
      <div class="legend">
        <span
          >Desayuno: <b>{{ desayuno }}</b></span
        >
        <span
          >Almuerzo: <b>{{ almuerzo }}</b></span
        >
        <span
          >Cena: <b>{{ cena }}</b></span
        >
      </div>
    </div>
  </div>
</template>

<style scoped>
.card{ padding:1rem; border:1px solid #2b2b2b; border-radius:12px; background:#111; color:#eee }
.header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem }
.pill{ background:#222; border:1px solid #333; padding:.2rem .5rem; border-radius:999px; font-variant-numeric: tabular-nums; }
.bar{ height:14px; background:#1a1a1a; border-radius:8px; overflow:hidden; border:1px solid #333 }
.fill{ height:100%; background:linear-gradient(90deg,#5eead4,#22d3ee,#60a5fa); transition:width .4s ease }
.legend{ display:flex; gap:1rem; margin-top:.5rem; font-size:.95rem }
</style>