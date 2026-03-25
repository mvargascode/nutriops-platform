<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import SplashScreen from "@/components/SplashScreen.vue";

const auth = useAuthStore();
</script>

<template>
  <SplashScreen v-if="!auth.initialized" />
  <router-view v-else />
</template>