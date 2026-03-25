<template>
  <div class="ticket">
    <div class="title">NutriOps</div>
    <div class="sub">CASINO FUNCIONARIOS</div>

    <div class="hr" />

    <div class="row"><b>Nombre:</b> {{ nombre }}</div>
    <div class="row"><b>RUT:</b> {{ rut }}</div>

    <div class="hr" />

    <div class="big">{{ (tipoLabel || "").toUpperCase() }}</div>

    <div class="row"><b>Fecha:</b> {{ fecha }}</div>
    <div class="row"><b>Hora:</b> {{ hora }}</div>

    <div class="hr" />
    <div class="thanks">Gracias</div>
  </div>
</template>

<script setup lang="ts">
import "../assets/styles/ticket.css";
import { onMounted, computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const nombre = computed(() => String(route.query.nombre ?? ""));
const rut = computed(() => String(route.query.rut ?? ""));
const tipoLabel = computed(() => String(route.query.tipoLabel ?? ""));
const fecha = computed(() => String(route.query.fecha ?? ""));
const hora = computed(() => String(route.query.hora ?? ""));

onMounted(() => {
  setTimeout(() => {
    window.print();
    setTimeout(() => window.close(), 150);
  }, 250);
});
</script>