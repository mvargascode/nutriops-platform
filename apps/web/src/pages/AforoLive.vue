<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import GaugeSemi from "@/components/GaugeSemi.vue";
import { useTweenNumber } from "@/composables/useTweenNumber";

const tipo = 2; // 1=Desayuno, 2=Almuerzo, 3=Cena
const ventanaMin = 30;
// const turno = undefined; // si quieres: const turno = 1;

const ocupacion = ref(0);
const capacidad = ref(160); // fallback
const online = ref(true);

const ocupAnim = useTweenNumber(ocupacion, { duration: 600, precision: 0 });

const porcentaje = computed(() =>
  capacidad.value ? Math.round((ocupacion.value / capacidad.value) * 100) : 0,
);

// Mapa de color por % (solo si tu GaugeSemi soporta prop `color`)
const color = computed(() => {
  const p = porcentaje.value;
  if (p < 70) return "#16a34a";
  if (p < 90) return "#f59e0b";
  return "#dc2626";
});

let es: EventSource | null = null;

function buildUrl() {
  const params = new URLSearchParams();
  params.set("tipo", String(tipo));
  params.set("ventanaMin", String(ventanaMin));
  // if (turno !== undefined) params.set("turno", String(turno));
  return `/api/aforo/ocupacion/stream?${params.toString()}`;
}

onMounted(() => {
  es = new EventSource(buildUrl());

  es.onopen = () => {
    online.value = true;
  };

  es.onerror = () => {
    // el navegador reconecta solo; marcamos offline para feedback visual
    online.value = false;
  };

  es.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      ocupacion.value = Number(d.ocupacion ?? 0);
      if (d.capacidad !== undefined && d.capacidad !== null) {
        const cap = Number(d.capacidad);
        if (Number.isFinite(cap) && cap > 0) capacidad.value = cap;
      }
      online.value = true;
    } catch {
      // ignore
    }
  };
});

onUnmounted(() => {
  try {
    es?.close();
  } catch {}
});
</script>

<template>
  <main class="live-wrap">
    <div class="card">
      <GaugeSemi
        :value="ocupAnim"
        :max="capacidad"
        :min="0"
        :color="color"
        title="Capacidad Casino"
        units="usuarios"
        :showPercent="true"
      />

      <p class="meta">
        <span>Ocupación:</span> <strong>{{ porcentaje }}%</strong>
        <span style="margin-left: 0.75rem">/ Capacidad:</span>
        <strong>{{ capacidad }}</strong>
      </p>

      <p v-if="!online" class="offline">Conexión perdida… reconectando</p>
    </div>
  </main>
</template>

<style scoped>
.live-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}
.card {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}
.meta {
  text-align: center;
  color: #374151;
  margin-top: 0.5rem;
}
.meta strong {
  font-weight: 800;
}
.offline {
  margin-top: 10px;
  text-align: center;
  font-weight: 800;
  color: #b91c1c;
}
</style>
