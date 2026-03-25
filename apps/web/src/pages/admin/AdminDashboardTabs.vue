<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const active = computed(() => String(route.name ?? ""));

function go(name: string) {
  if (active.value === name) return;
  router.push({ name });
}
</script>

<template>
  <div class="dash-tabs-page">
    <!-- Header (un poco menos ancho que las cards, estilo “título”) -->
    <div class="dash-head">
      <div class="dash-head__left">
        <h2>Dashboard</h2>
        <p>Selecciona la vista que quieres revisar.</p>
      </div>

      <div class="dash-switch" role="tablist" aria-label="Vistas dashboard">
        <button
          class="dash-switch__btn"
          :class="{ active: active === 'admin-dashboard-operativo' }"
          type="button"
          @click="go('admin-dashboard-operativo')"
        >
          Operativo
        </button>

        <button
          class="dash-switch__btn"
          :class="{ active: active === 'admin-dashboard-overview' }"
          type="button"
          @click="go('admin-dashboard-overview')"
        >
          Ejecutivo
        </button>
      </div>
    </div>

    <!-- IMPORTANTE: sin wrapper blanco extra -->
    <router-view />
  </div>
</template>

<style scoped>
/* Este es el “ancho maestro” de las cards */
.dash-tabs-page {
  width: min(93%, 1500px);
  margin: 0 auto;
  padding: 14px 0 18px;
  display: flex;
  flex-direction: column;

  /* controla el espacio título -> cards (sin margin-bottom) */
  gap: 18px;
}

/* Header: un poco más angosto que las cards */
.dash-head {
  width: min(88%, 1350px); /* <- más angosto para verse “título” */
  margin: 0 auto; /* <- centrado */
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--sombra);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.dash-head__left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.dash-head__left p {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}

/* Tabs tipo pill */
.dash-switch {
  background: #f3f4f6;
  border: 1px solid rgba(17, 24, 39, 0.1);
  padding: 5px;
  border-radius: 999px;
  display: flex;
  gap: 6px;
}

.dash-switch__btn {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-weight: 900;
  cursor: pointer;
  color: #111827;
}

.dash-switch__btn.active {
  background: #10106a;
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 16, 106, 0.25);
}

@media (max-width: 780px) {
  .dash-head {
    width: 100%;
  }
  .dash-head {
    flex-direction: column;
    align-items: stretch;
  }
  .dash-switch {
    justify-content: center;
  }
}
</style>
