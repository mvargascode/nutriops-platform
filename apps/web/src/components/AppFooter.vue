<script setup lang="ts">
import { computed, onBeforeMount } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

onBeforeMount(() => {
  if (!auth.hydrated) auth.hydrate();
});

// Ocultar si la ruta lo pide explícitamente
const hideAdminLink = computed(() => !!(route.meta as any)?.hideAdminLink);

// Detecta si estás dentro del admin
const isInAdmin = computed(() => route.path.startsWith("/admin"));

// Caso 1: No autenticado -> muestra link a Login (Acceso Administrador)
const showLoginLink = computed(() => {
  if (hideAdminLink.value) return false;
  return !auth.isAuthenticated && !isInAdmin.value;
});

// Caso 2: Autenticado como Admin -> muestra link a Admin directo
const showAdminPanelLink = computed(() => {
  if (hideAdminLink.value) return false;
  return auth.isAuthenticated && auth.isAdmin && !isInAdmin.value;
});

function logout() {
  auth.logout();
  router.push({ name: "dashboard" });
}
</script>

<template>
  <footer class="footerunidadtic">
    <p class="unidadtic">© 2026 mvargascode</p>

    <!-- Si NO hay sesión -->
    <RouterLink
      v-if="showLoginLink"
      class="login"
      :to="{ name: 'login' }"
    >
      Acceso Administrador
    </RouterLink>

    <!-- Si SÍ hay sesión y es Admin -->
    <RouterLink
      v-else-if="showAdminPanelLink"
      class="login"
      :to="{ name: 'admin-home' }"
    >
      Acceso Administrador
    </RouterLink>
  </footer>
</template>
