<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    mainMessage: string;
    subMessage?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "warning" | "danger";
    loading?: boolean;
  }>(),
  {
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "warning",
    loading: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm"): void;
}>();

function handleClose() {
  if (props.loading) return;
  emit("close");
}

function handleConfirm() {
  if (props.loading) return;
  emit("confirm");
}
</script>

<template>
  <div v-if="open" class="user-confirm-overlay" @click.self="handleClose">
    <div class="user-confirm-modal" :class="`is-${variant}`">
      <div class="user-confirm-header">
        <h3>{{ title }}</h3>

        <button
          type="button"
          class="user-confirm-close"
          :disabled="loading"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <div class="user-confirm-body">
        <p class="user-confirm-main">
          {{ mainMessage }}
        </p>

        <p v-if="subMessage" class="user-confirm-sub">
          {{ subMessage }}
        </p>
      </div>

      <div class="user-confirm-actions">
        <button
          type="button"
          class="btn-secondary"
          :disabled="loading"
          @click="handleClose"
        >
          {{ cancelText }}
        </button>

        <button
          type="button"
          class="btn-confirm"
          :class="variant === 'danger' ? 'btn-danger' : 'btn-warning'"
          :disabled="loading"
          @click="handleConfirm"
        >
          {{ loading ? "Procesando..." : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
