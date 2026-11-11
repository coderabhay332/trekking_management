import { api } from "../api.js";
import { state, setUser, notify } from "../store.js";

export default {
  template: `
  <div class="container py-4" style="max-width:560px">
    <div class="card shadow-sm">
      <div class="card-body p-4">
        <h4 class="mb-1">My profile</h4>
        <p class="text-muted small">{{ state.user.email }} &middot; {{ state.user.role }}</p>
        <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label">Name</label>
            <input class="form-control" v-model.trim="form.name" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Phone</label>
            <input class="form-control" v-model.trim="form.phone" pattern="[0-9+\\-\\s]{7,20}" title="7-20 digits">
          </div>
          <div class="mb-3">
            <label class="form-label">Address</label>
            <input class="form-control" v-model.trim="form.address">
          </div>
          <div class="mb-3">
            <label class="form-label">New password <span class="text-muted small">(optional)</span></label>
            <input type="password" class="form-control" v-model="form.password" minlength="6" autocomplete="new-password">
          </div>
          <button class="btn btn-success">Save changes</button>
        </form>
      </div>
    </div>
  </div>`,
  setup() {
    const u = state.user;
    const form = Vue.reactive({ name: u.name, phone: u.phone || "", address: u.address || "", password: "" });
    const error = Vue.ref("");

    const submit = async () => {
      error.value = "";
      try {
        const res = await api.put("/api/auth/profile", form);
        setUser(res.user);
        form.password = "";
        notify("Profile updated");
      } catch (e) {
        error.value = e.message;
      }
    };
    return { state, form, error, submit };
  },
};
