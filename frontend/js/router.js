import { state, homeFor } from "./store.js";
import Login from "./views/Login.js";
import Register from "./views/Register.js";
import Profile from "./views/Profile.js";
import Placeholder from "./views/Placeholder.js";

const routes = [
  { path: "/", redirect: () => (state.user ? homeFor(state.user.role) : "/login") },
  { path: "/login", component: Login, meta: { guest: true } },
  { path: "/register", component: Register, meta: { guest: true } },
  { path: "/profile", component: Profile, meta: { roles: ["admin", "staff", "trekker"] } },
  { path: "/admin", component: Placeholder, meta: { roles: ["admin"] } },
  { path: "/staff", component: Placeholder, meta: { roles: ["staff"] } },
  { path: "/user", component: Placeholder, meta: { roles: ["trekker"] } },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  const user = state.user;
  if (to.meta.guest && user) return homeFor(user.role);
  if (to.meta.roles) {
    if (!user) return { path: "/login", query: { redirect: to.fullPath } };
    if (!to.meta.roles.includes(user.role)) return homeFor(user.role);
  }
  return true;
});
