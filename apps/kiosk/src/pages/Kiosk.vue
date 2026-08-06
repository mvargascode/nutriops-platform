<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { issueTicket } from "../api/kiosk";
import "@/assets/styles/kiosk.css";

// ===== Estado RUT =====
const rutBody = ref(""); // solo dígitos (máx 8)
const rutDv = ref("");   // 0-9 o K

const loading = ref(false);

// ===== Overlay / Alert =====
const overlayOpen = ref(false);
const overlayTitle = ref<string>("Atención");
const overlayMsg = ref<string>("");
const overlayIsError = ref(true);
let overlayTimer: number | null = null;

// Sin supervisión: al cerrarse el overlay (éxito o error, por timeout o click)
// el RUT se limpia siempre, para que el totem quede listo para la próxima persona.
function showOverlay(msg: string, isError = true, title = "Atención", ms = 3500) {
  cancelIdleTimer();
  overlayTitle.value = title;
  overlayMsg.value = msg;
  overlayIsError.value = isError;
  overlayOpen.value = true;

  if (overlayTimer) window.clearTimeout(overlayTimer);
  overlayTimer = window.setTimeout(() => {
    overlayOpen.value = false;
    overlayTimer = null;
    resetInput();
  }, ms);
}

function closeOverlay() {
  overlayOpen.value = false;
  if (overlayTimer) window.clearTimeout(overlayTimer);
  overlayTimer = null;
  resetInput();
}

// ===== Inactividad =====
// Si alguien deja el RUT a medio llenar y se aleja sin enviar ni limpiar,
// se resetea solo despues de un rato para no dejar datos de una persona
// visibles indefinidamente en un totem sin supervision.
const IDLE_CLEAR_MS = 20000;
let idleTimer: number | null = null;

function cancelIdleTimer() {
  if (idleTimer) window.clearTimeout(idleTimer);
  idleTimer = null;
}

function scheduleIdleTimer() {
  cancelIdleTimer();
  if (!rutBody.value && !rutDv.value) return;
  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    if (!overlayOpen.value) resetInput();
  }, IDLE_CLEAR_MS);
}

function resetInput() {
  rutBody.value = "";
  rutDv.value = "";
  cancelIdleTimer();
}

// ===== Feedback teclas =====
const pressedKey = ref<string | null>(null);
function flash(key: string) {
  pressedKey.value = key;
  window.setTimeout(() => {
    if (pressedKey.value === key) pressedKey.value = null;
  }, 120);
}

// ===== Formato pantalla =====
const rutDisplay = computed(() => {
  if (!rutBody.value) return "";
  const withDots = rutBody.value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return rutDv.value ? `${withDots}-${rutDv.value}` : withDots;
});

const rutForApi = computed(() => (rutDv.value ? `${rutBody.value}-${rutDv.value}` : rutBody.value));

// ===== Teclado =====
function pressKey(key: string) {
  flash(key);

  // Si el overlay está abierto, no aceptar input
  if (overlayOpen.value) return;

  // Dígito
  if (/^\d$/.test(key)) {
    // Si aún no hay DV:
    // - Si body < 8 => sigue llenando body
    // - Si body == 8 => el dígito pasa a ser DV
    if (!rutDv.value) {
      if (rutBody.value.length < 8) {
        rutBody.value += key;
      } else {
        rutDv.value = key; // ✅ aquí estaba el problema
      }
      scheduleIdleTimer();
      return;
    }

    // Si ya hay DV, ignorar más números
    return;
  }

  // K como DV
  if (key === "K") {
    if (!rutBody.value) return;
    if (!rutDv.value) {
      rutDv.value = "K";
      scheduleIdleTimer();
    }
    return;
  }
}

function backspaceRut() {
  flash("BACK");
  if (overlayOpen.value) return;

  if (rutDv.value) {
    rutDv.value = "";
    scheduleIdleTimer();
    return;
  }
  rutBody.value = rutBody.value.slice(0, -1);
  scheduleIdleTimer();
}

function clearRut() {
  flash("CLEAR");
  if (overlayOpen.value) return;

  resetInput();
}

// ===== Enviar =====
async function submit() {
  flash("ENTER");
  if (overlayOpen.value) return;

  if (!rutBody.value || rutBody.value.length < 7) {
    showOverlay("Ingrese un RUT válido.", true, "Error", 3500);
    return;
  }
  if (!rutDv.value) {
    showOverlay("Ingrese RUT completo (con dígito verificador).", true, "Falta DV", 3500);
    return;
  }

  loading.value = true;
  try {
    const res = await issueTicket(rutForApi.value);

    if (!res?.ok) {
      showOverlay(res?.message ?? "Error al emitir ticket", true, "Error", 4000);
      return;
    }

    // El RUT se limpia solo cuando este overlay de éxito se cierra (ver showOverlay).
    showOverlay(`Ticket emitido: ${res.tipoLabel}`, false, "✅ Listo", 2200);
  } catch (e: any) {
    showOverlay(e?.message ?? "Error inesperado", true, "Error", 4000);
  } finally {
    loading.value = false;
  }
}

// ===== Teclado físico =====
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    if (overlayOpen.value) closeOverlay();
    else clearRut();
    return;
  }
  if (e.key === "Backspace") {
    e.preventDefault();
    backspaceRut();
    return;
  }

  const k = e.key.toUpperCase();
  if (/^\d$/.test(k)) pressKey(k);
  if (k === "K") pressKey("K");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  cancelIdleTimer();
  if (overlayTimer) window.clearTimeout(overlayTimer);
});
</script>

<template>
  <div class="kioskRoot">
    <header class="kioskHeader">
      <h1>Totem NutriOps</h1>
      <p>Ingrese su RUT para emitir ticket</p>
    </header>

    <main class="kioskMain">
      <div class="kioskCard">
        <label class="kioskLabel">RUT</label>

        <input class="kioskRutInput" readonly :value="rutDisplay" />

        <button
          class="kioskEmitBtn"
          :disabled="loading"
          :class="{ pressed: pressedKey === 'ENTER' }"
          @click="submit"
        >
          {{ loading ? "Procesando..." : "Emitir Ticket" }}
        </button>

        <div class="kioskHint">Presione <b>ENTER</b> para confirmar</div>

        <div class="kioskKeypad">
          <button v-for="n in [1,2,3]" :key="'a'+n" @click="pressKey(String(n))" :class="{ pressed: pressedKey === String(n) }">
            {{ n }}
          </button>
          <button v-for="n in [4,5,6]" :key="'b'+n" @click="pressKey(String(n))" :class="{ pressed: pressedKey === String(n) }">
            {{ n }}
          </button>
          <button v-for="n in [7,8,9]" :key="'c'+n" @click="pressKey(String(n))" :class="{ pressed: pressedKey === String(n) }">
            {{ n }}
          </button>

          <button @click="pressKey('0')" :class="{ pressed: pressedKey === '0' }">0</button>
          <button @click="pressKey('K')" :class="{ pressed: pressedKey === 'K' }">K</button>
          <button @click="backspaceRut" :class="{ pressed: pressedKey === 'BACK' }">⌫</button>

          <button class="wide" @click="clearRut" :class="{ pressed: pressedKey === 'CLEAR' }">Limpiar</button>
        </div>
      </div>
    </main>

    <footer class="kioskFooter">ESC para limpiar</footer>

    <!-- ✅ OVERLAY -->
    <div v-if="overlayOpen" class="kioskOverlay" @click="closeOverlay">
      <div class="kioskOverlayModal" :class="{ ok: !overlayIsError }" @click.stop>
        <div class="kioskOverlayTitle">{{ overlayTitle }}</div>
        <div class="kioskOverlayMsg">{{ overlayMsg }}</div>
      </div>
    </div>
  </div>
</template>