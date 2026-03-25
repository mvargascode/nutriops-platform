<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import "@/assets/styles/admin/adminDashboard.css";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  to?: string;
}

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const role = computed(() => auth.user?.role ?? "");

const canViewDashboard = computed(() =>
  ["Admin", "Nutricion", "RRHH"].includes(role.value),
);

const canViewMenu = computed(() => ["Admin", "Nutricion"].includes(role.value));

const canViewReports = computed(() =>
  ["Admin", "Nutricion", "RRHH"].includes(role.value),
);

const canViewUsers = computed(() => ["Admin", "RRHH"].includes(role.value));

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [];

  if (canViewDashboard.value) {
    items.push({
      id: "dashboard",
      label: "Dashboard",
      icon: "/img/iconos/dashboard.png",
      to: "/admin/dashboard/operativo",
    });
  }
  if (canViewMenu.value) {
    items.push({
      id: "menu",
      label: "Menú",
      icon: "/img/iconos/menu.png",
      to: "/admin/menu",
    });
  }

  if (canViewReports.value) {
    items.push({
      id: "reportes",
      label: "Reportes",
      icon: "/img/iconos/reportes.png",
      to: "/admin/reportes",
    });
  }

  if (canViewUsers.value) {
    items.push({
      id: "usuarios",
      label: "Usuarios",
      icon: "/img/iconos/usuarios.png",
      to: "/admin/usuarios",
    });
  }

  items.push({
    id: "salir",
    label: "Salir",
    icon: "/img/iconos/salir.png",
  });

  return items;
});

function isAllowedPath(path: string) {
  if (path.startsWith("/admin/menu")) {
    return canViewMenu.value;
  }

  if (path.startsWith("/admin/usuarios")) {
    return canViewUsers.value;
  }

  if (path.startsWith("/admin/reportes")) {
    return canViewReports.value;
  }

  if (path.startsWith("/admin/dashboard")) {
    return canViewDashboard.value;
  }

  return true;
}

watch(
  () => route.path,
  (newPath) => {
    if (!isAllowedPath(newPath)) {
      router.replace("/admin/dashboard/operativo");
    }
  },
  { immediate: true },
);

const isMenuExpanded = ref(true);

const toggleMenu = () => {
  isMenuExpanded.value = !isMenuExpanded.value;
};

const logout = () => {
  auth.logout();
  router.replace("/");
};

const currentDate = ref("");
let interval: number | null = null;

const updateDateTime = () => {
  const now = new Date();

  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  currentDate.value = `${days[now.getDay()]}, ${now.getDate()} de ${
    months[now.getMonth()]
  } de ${now.getFullYear()}, ${hh}:${mm}:${ss}`;
};

onMounted(() => {
  updateDateTime();
  interval = window.setInterval(updateDateTime, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

function isActiveItem(item: MenuItem) {
  if (!item.to) return false;

  if (item.id === "dashboard") {
    return route.path.startsWith("/admin/dashboard");
  }

  return route.path.startsWith(item.to);
}
</script>

<template>
  <div class="page-admin">
    <nav class="top-bar-admin">
      <div class="date-time-admin">
        <img
          src="/img/calendario.png"
          alt="calendar"
          class="calendar-icon-admin"
        />
        <span>{{ currentDate }}</span>
      </div>

      <div class="header-center-admin">
        <img src="/img/iconnutriops.png" alt="logo" class="logo-admin" />
        <h1>NutriOps - Admin Dashboard</h1>
      </div>

      <div class="exit-container-admin">
        <button class="exit-link-admin" type="button" @click="logout">
          Salir
        </button>
      </div>
    </nav>

    <main class="main-layout-admin" :class="{ collapsed: !isMenuExpanded }">
      <aside class="sidebar-admin" :class="{ active: !isMenuExpanded }">
        <ul class="menu-list-admin">
          <li
            v-for="item in menuItems"
            :key="item.id"
            :class="{ hovered: isActiveItem(item) }"
          >
            <RouterLink
              v-if="item.id !== 'salir' && item.to"
              class="menu-link"
              :to="item.to"
            >
              <span class="icon-admin">
                <img :src="item.icon" :alt="item.label" />
              </span>
              <span class="section-admin">{{ item.label }}</span>
            </RouterLink>

            <a v-else href="#" class="menu-link" @click.prevent="logout">
              <span class="icon-admin">
                <img :src="item.icon" :alt="item.label" />
              </span>
              <span class="section-admin">{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </aside>

      <div class="content-admin">
        <div class="toggle-container-admin">
          <button
            class="toggle-icon-admin"
            type="button"
            @click.stop="toggleMenu"
            aria-label="Abrir menú"
          >
            <img src="/img/iconos/barra.png" alt="menu" />
          </button>
        </div>

        <div class="content-body-admin">
          <router-view :key="$route.fullPath" />
        </div>

        <footer class="footer-admin">
          <p>© 2026 mvargascode</p>
        </footer>
      </div>
    </main>
  </div>
</template>
