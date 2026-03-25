import axios from "axios";
import router from "@/router/routes";
import { useAuthStore } from "@/stores/auth";

export const http = axios.create({
  baseURL: "/api",
  timeout: 5000,
});

export const httpReports = axios.create({
  baseURL: "/api/reports",
  timeout: 5000,
});

export const httpAuth = axios.create({
  baseURL: "/api/auth",
  timeout: 5000,
});

export const httpAforo = axios.create({
  baseURL: "/api/aforo",
  timeout: 5000,
});

export const httpNutricion = axios.create({
  baseURL: "/api/nutricion",
  timeout: 5000,
});

export const httpUsers = axios.create({
  baseURL: "/api/users",
  timeout: 5000,
});

function attachAuth(instance: any) {
  instance.interceptors.request.use((config: any) => {
    const auth = useAuthStore();
    const token = auth.token;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      const status = error?.response?.status;
      const currentPath = router.currentRoute.value.fullPath;
      const auth = useAuthStore();

      if (status === 401 && currentPath !== "/login") {
        auth.logout();

        router.replace({
          path: "/login",
          query: { redirect: currentPath },
        });
      }

      return Promise.reject(error);
    }
  );
}

attachAuth(http);
attachAuth(httpAuth);
attachAuth(httpAforo);
attachAuth(httpNutricion);
attachAuth(httpUsers);