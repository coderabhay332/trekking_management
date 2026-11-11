import { state, logout } from "../store.js";

const NAV = {
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/treks", label: "Treks" },
    { to: "/admin/staff", label: "Staff" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/bookings", label: "Bookings" },
    { to: "/admin/reports", label: "Reports" },
  ],
  staff: [
    { to: "/staff", label: "Dashboard" },
    { to: "/staff/treks", label: "My Treks" },
  ],
  trekker: [
    { to: "/user", label: "Dashboard" },
    { to: "/user/treks", label: "Browse Treks" },
    { to: "/user/bookings", label: "My Bookings" },
    { to: "/user/history", label: "History" },
  ],
};

export default {
  template: `
  <nav class="navbar navbar-expand-lg navbar-dark bg-success sticky-top">
    <div class="container">
      <router-link class="navbar-brand" to="/"><i class="bi bi-compass"></i> TrekHub</router-link>
      <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="nav">
        <ul class="navbar-nav me-auto" v-if="state.user">
          <li class="nav-item" v-for="item in links" :key="item.to">
            <router-link class="nav-link" :to="item.to" active-class="active" exact-active-class="active">{{ item.label }}</router-link>
          </li>
        </ul>
        <ul class="navbar-nav ms-auto align-items-lg-center">
          <template v-if="state.user">
            <li class="nav-item"><router-link class="nav-link" to="/profile"><i class="bi bi-person-circle"></i> {{ state.user.name }}</router-link></li>
            <li class="nav-item"><a class="nav-link" href="#" @click.prevent="doLogout">Logout</a></li>
          </template>
          <template v-else>
            <li class="nav-item"><router-link class="nav-link" to="/login">Login</router-link></li>
            <li class="nav-item"><router-link class="nav-link" to="/register">Register</router-link></li>
          </template>
        </ul>
      </div>
    </div>
  </nav>`,
  setup() {
    const router = VueRouter.useRouter();
    const links = Vue.computed(() => (state.user ? NAV[state.user.role] || [] : []));
    const doLogout = () => {
      logout();
      router.push("/login");
    };
    return { state, links, doLogout };
  },
};
