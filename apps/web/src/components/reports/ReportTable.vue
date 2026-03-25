<script setup lang="ts">
import { computed } from "vue";
import type { ConsumoDiaRow } from "@/api/reports";

const props = defineProps<{
  rows: ConsumoDiaRow[];
  loading?: boolean;
}>();

const totals = computed(() => {
  const t = { d1: 0, d2: 0, d3: 0, total: 0 };
  for (const r of props.rows || []) {
    t.d1 += r.d1 || 0;
    t.d2 += r.d2 || 0;
    t.d3 += r.d3 || 0;
    t.total += r.total || 0;
  }
  return t;
});
</script>

<template>
  <div class="rep-table">
    <div class="rep-table__head">
      <h3>Detalle por día</h3>
    </div>

    <div class="rep-table__wrap">
      <table>
        <colgroup>
          <col class="col-fecha" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-num" />
        </colgroup>

        <thead>
          <tr>
            <th class="th-fecha">Fecha</th>
            <th class="th-num">Desayuno</th>
            <th class="th-num">Almuerzo</th>
            <th class="th-num">Cena</th>
            <th class="th-num">Total</th>
          </tr>
        </thead>

        <tbody v-if="!loading">
          <tr v-for="r in rows" :key="r.fecha">
            <td class="td-fecha">{{ r.fecha }}</td>
            <td class="td-num">{{ r.d1 }}</td>
            <td class="td-num">{{ r.d2 }}</td>
            <td class="td-num">{{ r.d3 }}</td>
            <td class="td-num strong">{{ r.total }}</td>
          </tr>
        </tbody>

        <tbody v-else>
          <tr v-for="i in 6" :key="i">
            <td colspan="5" class="loading-row">Cargando...</td>
          </tr>
        </tbody>

        <tfoot v-if="rows?.length && !loading">
          <tr>
            <td class="td-fecha strong">TOTAL</td>
            <td class="td-num strong">{{ totals.d1 }}</td>
            <td class="td-num strong">{{ totals.d2 }}</td>
            <td class="td-num strong">{{ totals.d3 }}</td>
            <td class="td-num strong">{{ totals.total }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.rep-table {
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--sombra);
  padding: 12px 14px;
}

.rep-table__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rep-table__head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 900;
  color: #111827;
}

.rep-table__wrap {
  margin-top: 10px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 620px; /* evita que se “aplasten” las columnas en pantallas chicas */
}

/* Column widths */
.col-fecha {
  width: 28%;
}
.col-num {
  width: 18%;
}

th,
td {
  padding: 12px 10px;
  vertical-align: middle;
  white-space: nowrap;
}

/* Headers */
th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #374151;
}

.th-fecha {
  text-align: left;
}
.th-num {
  text-align: center;
}

/* Cells */
.td-fecha {
  text-align: left;
}
.td-num {
  text-align: center; /* ✅ esto alinea con los títulos */
}

.strong {
  font-weight: 900;
}

.loading-row {
  color: #6b7280;
  font-weight: 700;
  text-align: center;
}

tfoot td {
  border-top: 2px solid #111827;
}
</style>