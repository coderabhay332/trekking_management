import { state } from "../store.js";

export default {
  template: `
  <div class="container py-4">
    <h4>Welcome, {{ state.user.name }}</h4>
    <p class="text-muted">Signed in as {{ state.user.role }}.</p>
  </div>`,
  setup() {
    return { state };
  },
};
