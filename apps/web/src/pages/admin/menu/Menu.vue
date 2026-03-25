<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import MenuGestionTab from "./MenuGestionTab.vue";
import MenuSemanaTab from "./MenuSemanaTab.vue";
import MenuImportarTab from "./MenuImportarTab.vue";

type MenuTab = "gestion" | "semana" | "importar";

const router = useRouter();
const auth = useAuthStore();

const role = computed(() => auth.user?.role ?? "");
const canManageMenu = computed(() =>
  ["Admin", "Nutricion"].includes(role.value),
);

const activeTab = ref<MenuTab>("gestion");

watchEffect(() => {
  if (!canManageMenu.value) {
    router.replace("/dashboard");
  }
});
</script>

<template>
  <section v-if="canManageMenu" class="menu-page">
    <div class="menu-header-card">
      <div>
        <h1>Menú</h1>
        <p>Gestiona, visualiza e importa la información del menú.</p>
      </div>

      <div class="menu-tabs">
        <button
          class="menu-tab-btn"
          :class="{ active: activeTab === 'gestion' }"
          @click="activeTab = 'gestion'"
        >
          Gestión Menú
        </button>

        <button
          class="menu-tab-btn"
          :class="{ active: activeTab === 'semana' }"
          @click="activeTab = 'semana'"
        >
          Menú Semanal
        </button>

        <button
          class="menu-tab-btn"
          :class="{ active: activeTab === 'importar' }"
          @click="activeTab = 'importar'"
        >
          Importar Menú
        </button>
      </div>
    </div>

    <div class="menu-tab-content">
      <MenuGestionTab v-if="activeTab === 'gestion'" />
      <MenuSemanaTab v-else-if="activeTab === 'semana'" />
      <MenuImportarTab v-else />
    </div>
  </section>
</template>

<style scoped>
.menu-page {
  width: min(93%, 1500px);
  margin: 0 auto;
  padding: 14px 0 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.menu-header-card {
  width: min(88%, 1350px);
  margin: 0 auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: var(--sombra);
  padding: 14px 16px;
}

.menu-header-card h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.menu-header-card p {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
}

.menu-tabs {
  margin-top: 14px;
  background: #f3f4f6;
  border: 1px solid rgba(17, 24, 39, 0.1);
  padding: 5px;
  border-radius: 999px;
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.menu-tab-btn {
  height: 38px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-weight: 900;
  cursor: pointer;
  color: #111827;
}

.menu-tab-btn.active {
  background: #10106a;
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 16, 106, 0.25);
}

.menu-tab-content {
  width: 100%;
}
</style>