import { setUnauthorizedHandler } from "./api.js";
import { state, logout } from "./store.js";
import { router } from "./router.js";
import NavBar from "./components/NavBar.js";

const App = {
  components: { NavBar },
  template: `
  <nav-bar></nav-bar>
  <div class="toast-wrap">
    <div v-for="t in state.toasts" :key="t.id" class="alert shadow-sm py-2" :class="'alert-' + t.type">{{ t.message }}</div>
  </div>
  <router-view></router-view>`,
  setup() {
    return { state };
  },
};

setUnauthorizedHandler(() => {
  logout();
  router.push("/login");
});

Vue.createApp(App).use(router).mount("#app");
