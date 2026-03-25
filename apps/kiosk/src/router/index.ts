import { createRouter, createWebHistory } from "vue-router";
import Kiosk from "../pages/Kiosk.vue";
import Ticket from "../pages/Ticket.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "kiosk", component: Kiosk },
    { path: "/ticket", name: "ticket", component: Ticket },
  ],
});