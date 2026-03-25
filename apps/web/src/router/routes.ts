import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// Públicas
import Dashboard from "@/pages/Dashboard.vue";
import Login from "@/pages/Login.vue";
import Aforo from "@/pages/Aforo.vue";
import AforoLive from "@/pages/AforoLive.vue";
import Nutricion from "@/pages/Nutricion.vue";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard.vue";
import AdminDashboardTabs from "@/pages/admin/AdminDashboardTabs.vue";
import AdminHome from "@/pages/admin/AdminHome.vue";
import Overview from "@/pages/admin/Overview.vue";
import MenuView from "@/pages/admin/menu/Menu.vue";
import UsuariosView from "@/pages/admin/usuarios/Usuarios.vue";
import ReportsView from "@/pages/admin/reports/Reports.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "public-dashboard",
      component: Dashboard,
    },
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/aforo",
      name: "aforo",
      component: Aforo,
    },
    {
      path: "/aforo-live",
      name: "aforo-live",
      component: AforoLive,
    },
    {
      path: "/nutricion",
      name: "nutricion",
      component: Nutricion,
    },
    {
      path: "/admin",
      component: AdminDashboard,
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          redirect: "/admin/dashboard/operativo",
        },
        {
          path: "dashboard",
          component: AdminDashboardTabs,
          meta: { roles: ["Admin", "Nutricion", "RRHH"] },
          children: [
            {
              path: "",
              redirect: { name: "admin-dashboard-operativo" },
            },
            {
              path: "operativo",
              name: "admin-dashboard-operativo",
              component: AdminHome,
              meta: { roles: ["Admin", "Nutricion", "RRHH"] },
            },
            {
              path: "overview",
              name: "admin-dashboard-overview",
              component: Overview,
              meta: { roles: ["Admin", "Nutricion", "RRHH"] },
            },
          ],
        },
        {
          path: "menu",
          name: "menu",
          component: MenuView,
          meta: { roles: ["Admin", "Nutricion"] },
        },
        {
          path: "usuarios",
          name: "usuarios",
          component: UsuariosView,
          meta: { roles: ["Admin", "RRHH"] },
        },
        {
          path: "reportes",
          name: "reportes",
          component: ReportsView,
          meta: { roles: ["Admin", "Nutricion", "RRHH"] },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const allowedRoles = to.meta.roles as string[] | undefined;

  // Mientras inicializa auth, no fuerces redirecciones
  if (!auth.initialized) {
    return next();
  }

  const token = auth.token;
  const role = auth.user?.role ?? "";

  if (requiresAuth && !token) {
    return next({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }

  if (requiresAuth && allowedRoles && (!role || !allowedRoles.includes(role))) {
    return next("/admin/dashboard/operativo");
  }

  return next();
});

export default router;