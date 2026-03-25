import { defineStore } from "pinia";

export type SseStatus = "idle" | "connecting" | "open" | "closed" | "error";

type Handlers = {
  onOpen?: () => void;
  onMessage?: (ev: MessageEvent<string>) => void;
  onError?: (ev: Event) => void;
};

type Channel = {
  key: string;
  url: string;
  es: EventSource | null;
  status: SseStatus;
  openedAt: number | null;
  lastError: string | null;
  connectCount: number;
  retryTimer: number | null;
  retryMs: number;
  handlers: Handlers;
};

function safeClose(es: EventSource | null) {
  if (!es) return;
  try {
    es.onopen = null;
    es.onmessage = null;
    es.onerror = null;
    es.close();
  } catch {}
}

export const useSseStore = defineStore("sse", {
  state: () => ({
    channels: {} as Record<string, Channel>,
  }),

  getters: {
    getChannel: (s) => (key: string) => s.channels[key] ?? null,
    statusOf: (s) => (key: string) => s.channels[key]?.status ?? "idle",
    isOpen: (s) => (key: string) => s.channels[key]?.status === "open",
  },

  actions: {
    subscribe(key: string, url: string, handlers: Handlers = {}, opts?: { retryMs?: number }) {
      const nextUrl = (url ?? "").trim();
      if (!nextUrl) return;

      const existing = this.channels[key];

      // 🔒 Si ya está open/conectando al mismo URL, solo actualiza handlers y listo
      if (
        existing &&
        existing.es &&
        (existing.status === "connecting" || existing.status === "open") &&
        existing.url === nextUrl
      ) {
        existing.handlers = handlers;
        return;
      }

      // si existe canal previo, ciérralo limpio
      if (existing) this.unsubscribe(key);

      const ch: Channel = {
        key,
        url: nextUrl,
        es: null,
        status: "connecting",
        openedAt: null,
        lastError: null,
        connectCount: (existing?.connectCount ?? 0) + 1,
        retryTimer: null,
        retryMs: opts?.retryMs ?? 3000,
        handlers,
      };

      this.channels[key] = ch;

      const es = new EventSource(nextUrl);
      ch.es = es;

      es.onopen = () => {
        // ignora eventos viejos si el canal cambió
        if (this.channels[key]?.es !== es) return;
        ch.status = "open";
        ch.openedAt = Date.now();
        ch.lastError = null;
        ch.handlers.onOpen?.();
      };

      es.onmessage = (ev) => {
        if (this.channels[key]?.es !== es) return;
        ch.handlers.onMessage?.(ev);
      };

      es.onerror = (ev) => {
        if (this.channels[key]?.es !== es) return;

        ch.status = "error";
        ch.lastError = "SSE error";
        ch.handlers.onError?.(ev);

        // El navegador reintenta solo, pero nosotros hacemos “reconexión controlada”
        // para garantizar que NO quede un es colgado en estados raros.
        if (ch.retryTimer) return;

        safeClose(ch.es);
        ch.es = null;

        ch.retryTimer = window.setTimeout(() => {
          // si el canal fue removido mientras tanto, no reconectar
          if (!this.channels[key]) return;
          ch.retryTimer = null;
          // reconectar mismo canal/URL
          this.subscribe(key, ch.url, ch.handlers, { retryMs: ch.retryMs });
        }, ch.retryMs);
      };
    },

    unsubscribe(key: string) {
      const ch = this.channels[key];
      if (!ch) return;

      if (ch.retryTimer) {
        clearTimeout(ch.retryTimer);
        ch.retryTimer = null;
      }

      safeClose(ch.es);
      ch.es = null;
      ch.status = "closed";
      ch.openedAt = null;
      ch.lastError = null;

      delete this.channels[key];
    },

    unsubscribeAll() {
      Object.keys(this.channels).forEach((k) => this.unsubscribe(k));
    },
  },
});