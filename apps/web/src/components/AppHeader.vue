<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

type RouteLike = { name?: string } | string | Record<string, any>

const props = defineProps<{
  to?: RouteLike | null
  showNav?: boolean
  rightLinkText?: string
  rightLinkHref?: string
  hour12?: boolean
}>()

const reloj = ref('')

function tick() {
  const now = new Date();
  const tz = 'America/Santiago'

  const fecha = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: tz
  }).format(now)

  const hora = new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: tz,
    ...(props.hour12 !== undefined ? { hour12: props.hour12 } : {})
  }).format(now)

  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1)
  reloj.value = `${fechaCap}, ${hora}`
}

let t: number | undefined
onMounted(() => { tick(); t = window.setInterval(tick, 1000) })
onBeforeUnmount(() => { if (t) clearInterval(t) })
</script>

<template>
  <component :is="to ? RouterLink : 'div'" :to="to || undefined" style="text-decoration:none">
    <header class="encabezado">
      <img src="/img/iconnutriops.png" alt="icono" />
      <h1 class="titulo">NutriOps - Operational Food Service Platform</h1>
      <span class="spacer" aria-hidden="true"></span>
    </header>
  </component>

  <nav v-if="showNav !== false" class="barranavegacion">
    <div class="contenedor-calendario">
      <img class="iconocalendario" src="/img/calendario.png" alt="calendario" />
      <span class="fecha"></span>
      <span class="hora" id="reloj">{{ reloj }}</span>
    </div>

    <div class="navegacion-principal">
      <a v-if="rightLinkHref" class="links" :href="rightLinkHref" target="_blank" rel="noopener">
        {{ rightLinkText || 'Links' }}
      </a>
      <slot name="right" />
    </div>
  </nav>
</template>

<!-- VARIABLES: no scoped para que apliquen en el documento -->
<style>
:root{
  --blanco:#ffffff;
  --negro:#212121;
  --claro:#7adbf1;
  --medio:#2e5b9b;
  --oscuro:#10106a;
}
</style>

<!-- SOLO estilos del header/nav -->
<style scoped>
.encabezado{
  display:grid;
  grid-template-columns: 1fr auto 1fr;
  align-items:center;
  gap:1rem;
  padding: 1rem;
}
.titulo{ color:var(--oscuro); font-weight:700; }

.barranavegacion{
  display:flex; 
  align-items:center;
  background:#151B6B; 
  color:#fff;
  padding-inline: .75rem;
}

.contenedor-calendario{ 
  display:inline-flex; 
  align-items:center; 
  gap: .5rem;
  white-space: nowrap;
  min-width: 32ch;
}

.hora {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  white-space: nowrap;
}

.navegacion-principal {
  margin-left: auto;
  min-width: 5ch;
  text-align: right;
}

.iconocalendario{ width:5rem; }
.fecha,.hora{ font-weight:700; font-size: 1.5rem; line-height: 1.2; display: inline-block; height: 1.7rem; }
.navegacion-principal .links{
  color:#fff; text-decoration:none; font-weight:600;
}
</style>
