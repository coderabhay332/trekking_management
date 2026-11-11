import { api } from "../api.js";
import { notify } from "../store.js";

export default {
  template: `
  <div class="container">
    <div class="card auth-card shadow-sm">
      <div class="card-body p-4">
        <h4 class="mb-3 text-center">Create trekker account</h4>
        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label">Full name</label>
            <input class="form-control" v-model.trim="form.name" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" v-model.trim="form.email" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Phone</label>
            <input class="form-control" v-model.trim="form.phone" pattern="[0-9+\\-\\s]{7,20}" title="7-20 digits">
          </div>
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" v-model="form.password" required minlength="6">
          </div>
          <button class="btn btn-success w-100" :disabled="loading">Register</button>
        </form>
        <p class="text-center mt-3 mb-0 small">Already registered? <router-link to="/login">Login</router-link></p>
      </div>
    </div>
  </div>`,
  setup() {
    const router = VueRouter.useRouter();
    const form = Vue.reactive({ name: "", email: "", phone: "", password: "" });
    const error = Vue.ref("");
    const loading = Vue.ref(false);

    const submit = async () => {
      error.value = "";
      loading.value = true;
      try {
        await api.post("/api/auth/register", form);
        notify("Registration successful. Please log in.");
        router.push("/login");
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };
    return { form, error, loading, submit };
  },
};
