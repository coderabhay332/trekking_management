import { api } from "../api.js";
import { setUser, homeFor } from "../store.js";

export default {
  template: `
  <div class="container">
    <div class="card auth-card shadow-sm">
      <div class="card-body p-4">
        <h4 class="mb-3 text-center">Sign in</h4>
        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" v-model.trim="email" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" v-model="password" required minlength="6">
          </div>
          <button class="btn btn-success w-100" :disabled="loading">{{ loading ? "Signing in..." : "Login" }}</button>
        </form>
        <p class="text-center mt-3 mb-0 small">New trekker? <router-link to="/register">Create an account</router-link></p>
      </div>
    </div>
  </div>`,
  setup() {
    const router = VueRouter.useRouter();
    const route = VueRouter.useRoute();
    const email = Vue.ref("");
    const password = Vue.ref("");
    const error = Vue.ref("");
    const loading = Vue.ref(false);

    const submit = async () => {
      error.value = "";
      loading.value = true;
      try {
        const res = await api.post("/api/auth/login", { email: email.value, password: password.value });
        setUser(res.user, res.token);
        router.push(route.query.redirect || homeFor(res.user.role));
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };
    return { email, password, error, loading, submit };
  },
};
