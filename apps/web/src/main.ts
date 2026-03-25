import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "@/router/routes";
import { useAuthStore } from "@/stores/auth";

import "./assets/styles/globales.css";
import "./assets/styles/menuFrontal.css";
import "@/plugins/echarts";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount("#app");

const auth = useAuthStore();
auth.initAuth();