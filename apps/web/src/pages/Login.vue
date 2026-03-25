<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import fondoCasino from "@/assets/img/fondo6.png";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const user = ref("");
const password = ref("");
const show = ref(false);
const userInput = ref<HTMLInputElement | null>(null);

// Reloj/fecha
const now = ref(new Date());
let t: number | undefined;
onMounted(async () => {
  t = window.setInterval(() => (now.value = new Date()), 1000);

  await nextTick();

  setTimeout(() => {
    userInput.value?.focus();
  }, 50);
});
onBeforeUnmount(() => {
  if (t) clearInterval(t);
});

const fecha = computed(() => {
  const d = now.value;
  const wd = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    timeZone: "America/Santiago",
  }).format(d);
  const rest = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(d);
  return `${wd} ${rest}`;
});
const hora = computed(() =>
  new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
    hour12: true,
  }).format(now.value),
);

async function onSubmit() {
  try {
    await auth.login(user.value, password.value);

    const q = route.query.redirect;
    const redirect = Array.isArray(q) ? q[0] : q;

    router.replace(
      redirect && typeof redirect === "string"
        ? { path: redirect }
        : { name: "admin-dashboard-operativo" },
    );
  } catch {}
}
</script>

<template>
  <!-- Layout header | main (flex:1) | footer -->
  <div
    class="login-page login-bg"
    :style="{ backgroundImage: `url(${fondoCasino})` }"
  >
    <AppHeader
      :to="{ name: 'public-dashboard' }"
      :show-nav="true"
      right-link-text="Links"
      right-link-href="#"
    />

    <main>
      <div class="contendor">
        <div class="cajaformulario login" id="login-form">
          <form @submit.prevent="onSubmit">
            <h1>Login</h1>

            <div class="input-box">
              <input
                ref="userInput"
                v-model.trim="user"
                type="text"
                name="user"
                placeholder="Usuario"
                autocomplete="username"
                required
              />
              <img class="imgusuario" src="/img/usuario.png" alt="usuario" />
            </div>

            <div class="input-box">
              <input
                v-model="password"
                :type="show ? 'text' : 'password'"
                name="password"
                placeholder="Contraseña"
                autocomplete="current-password"
                required
              />
              <img class="imgcandado" src="/img/candado.png" alt="contraseña" />
            </div>

            <button class="botonentrar" type="submit" :disabled="auth.loading">
              {{ auth.loading ? "Ingresando..." : "Acceder" }}
            </button>

            <p v-if="auth.error" class="error">{{ auth.error }}</p>
          </form>
        </div>

        <div class="adorno">
          <div class="panel">
            <img src="/img/casino.png" alt="icono" />
            <h1>Casino</h1>
          </div>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped src="@/assets/styles/login.css"></style>
