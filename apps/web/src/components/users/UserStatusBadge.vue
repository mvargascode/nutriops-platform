<script setup lang="ts">
const props = defineProps<{
  isActive: number;
}>();
</script>

<template>
  <span
    class="status-badge"
    :class="props.isActive ? 'status-active' : 'status-inactive'"
  >
    {{ props.isActive ? "Activo" : "Inactivo" }}
  </span>
</template>
