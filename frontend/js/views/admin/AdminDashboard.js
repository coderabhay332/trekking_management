import { api } from "../../api.js";
import { StatCard, StatusBadge } from "../../components/Common.js";

export default {
  components: { StatCard, StatusBadge },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">Admin Dashboard</h4>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div class="row g-3 mb-4" v-if="d">
      <div class="col-6 col-lg-3"><stat-card label="Total Treks" :value="d.total_treks" icon="bi-signpost-split"></stat-card></div>
      <div class="col-6 col-lg-3"><stat-card label="Trekkers" :value="d.total_users" icon="bi-people" tone="primary"></stat-card></div>
      <div class="col-6 col-lg-3"><stat-card label="Staff" :value="d.total_staff" icon="bi-person-badge" tone="warning"></stat-card></div>
      <div class="col-6 col-lg-3"><stat-card label="Bookings" :value="d.total_bookings" icon="bi-ticket-perforated" tone="danger"></stat-card></div>
    </div>
    <div class="card stat-card" v-if="d">
      <div class="card-body">
        <h6>Treks by status</h6>
        <div class="d-flex flex-wrap gap-3">
          <div v-for="(count, status) in d.treks_by_status" :key="status">
            <status-badge :value="status"></status-badge> <strong>{{ count }}</strong>
          </div>
          <span v-if="!Object.keys(d.treks_by_status).length" class="text-muted">No treks yet</span>
        </div>
      </div>
    </div>
  </div>`,
  setup() {
    const d = Vue.ref(null);
    const error = Vue.ref("");
    Vue.onMounted(async () => {
      try { d.value = await api.get("/api/admin/dashboard"); } catch (e) { error.value = e.message; }
    });
    return { d, error };
  },
};
