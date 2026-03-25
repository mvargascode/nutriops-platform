<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
const now = ref(new Date());
let t: number | undefined;
onMounted(() => {
  t = window.setInterval(() => (now.value = new Date()), 1000);
});
onBeforeUnmount(() => {
  if (t) clearInterval(t);
});
const fecha = computed(() =>
  now.value.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
);
const hora = computed(() =>
  now.value.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
);
</script>

<template>
  <nav class="barranavegacion">
    <div class="contenedor-calendario">
      <img class="iconocalendario" src="/img/calendario.png" alt="calendario" />
      <span class="fecha">{{ fecha }}</span>
      <span class="hora" id="reloj">{{ hora }}</span>
    </div>
  </nav>
</template>
