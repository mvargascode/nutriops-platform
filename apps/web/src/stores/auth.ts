import { defineStore } from "pinia";
import { httpAuth } from "@/api/http";
import { useSseStore } from "@/stores/sse";

type User = {
  id: number;
  name: string;
  role: string;
  email?: string;
  username?: string;
};

const SESSION = sessionStorage;
const PERSIST = localStorage;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null as string | null,
    user: null as User | null,
    hydrated: false,
    loading: false,
    error: null as string | null,
    remember: false,
    verified: false,
    initialized: false,
    initializing: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdmin: (s) => (s.user?.role ?? (s.user as any)?.rol) === "Admin",
  },

  actions: {
    hydrate() {
      if (this.hydrated) return;

      let token = SESSION.getItem("token");
      let rawUser = SESSION.getItem("user");
      let remember = SESSION.getItem("remember") === "1";

      if (!token) {
        token = PERSIST.getItem("token");
        rawUser = PERSIST.getItem("user");
        remember = !!token;
      }

      this.token = token;
      this.user = rawUser ? JSON.parse(rawUser) : null;
      this.remember = remember;
      this.verified = false;
      this.hydrated = true;
    },

    startSession(token: string, user: User, remember = false) {
      this.token = token;
      this.user = user;
      this.remember = remember;

      const S = remember ? PERSIST : SESSION;

      (remember ? SESSION : PERSIST).removeItem("token");
      (remember ? SESSION : PERSIST).removeItem("user");
      (remember ? SESSION : PERSIST).removeItem("remember");

      S.setItem("token", token);
      S.setItem("user", JSON.stringify(user));
      S.setItem("remember", remember ? "1" : "0");

      this.verified = true;
    },

    async login(login: string, password: string, remember = false) {
      this.loading = true;
      this.error = null;

      try {
        const { data } = await httpAuth.post("/login", { login, password });
        const token = data?.token;
        const user = data?.user;

        if (!token || !user) {
          throw new Error("Respuesta inválida (sin token o user)");
        }

        this.startSession(token, user, remember);
        return true;
      } catch (e: any) {
        this.error =
          e?.response?.data?.error ??
          e?.message ??
          "No fue posible iniciar sesión.";

        this.logout();
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async verify() {
      try {
        if (!this.token) {
          this.verified = true;
          return false;
        }

        const { data } = await httpAuth.get("/me");

        if (data?.user) {
          this.user = data.user;
          const S = this.remember ? PERSIST : SESSION;
          S.setItem("user", JSON.stringify(this.user));
        }

        this.verified = true;
        return true;
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;

        if (status === 401) {
          this.logout();
          return false;
        }

        // Error de red o backend temporal:
        // no mates la sesión solo por eso
        this.verified = true;
        return true;
      }
    },

    async initAuth() {
      if (this.initializing || this.initialized) return;

      this.initializing = true;
      this.initialized = false;

      try {
        if (!this.hydrated) {
          this.hydrate();
        }

        if (!this.token) {
          this.verified = true;
          return;
        }

        // Timeout defensivo: no dejar splash eterno
        await Promise.race([
          this.verify(),
          (async () => {
            await wait(5000);
            throw new Error("Auth verify timeout");
          })(),
        ]);
      } catch (e) {
        console.error("initAuth error:", e);
      } finally {
        this.initializing = false;
        this.initialized = true;
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      this.remember = false;
      this.verified = false;

      const sse = useSseStore();
      sse.unsubscribeAll();

      for (const S of [SESSION, PERSIST]) {
        S.removeItem("token");
        S.removeItem("user");
        S.removeItem("remember");
      }
    },
  },
});