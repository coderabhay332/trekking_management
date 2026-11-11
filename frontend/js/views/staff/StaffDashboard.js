import { api } from "../../api.js";
import { StatCard, StatusBadge, fmtDate } from "../../components/Common.js";

export default {
  components: { StatCard, StatusBadge },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">Staff Dashboard</h4>
    <div v-if="d">
      <div class="row g-3 mb-4">
        <div class="col-md-4"><stat-card label="Assigned treks" :value="d.total_assigned" icon="bi-signpost-split"></stat-card></div>
        <div class="col-md-4"><stat-card label="Registered trekkers" :value="d.total_registered" icon="bi-people" tone="primary"></stat-card></div>
        <div class="col-md-4"><stat-card label="Open for booking" :value="d.open_treks" icon="bi-unlock" tone="warning"></stat-card></div>
      </div>
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead><tr><th>Trek</th><th>Location</th><th>Dates</th><th>Registered</th><th>Slots left</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="t in d.treks" :key="t.id">
              <td>{{ t.name }}</td><td>{{ t.location }}</td>
              <td class="small">{{ fmtDate(t.start_date) }} - {{ fmtDate(t.end_date) }}</td>
              <td>{{ t.registered_users }}</td><td>{{ t.available_slots }}</td>
              <td><status-badge :value="t.status"></status-badge></td>
            </tr>
            <tr v-if="!d.treks.length"><td colspan="6" class="text-center text-muted py-4">No treks assigned yet</td></tr>
          </tbody>
        </table>
      </div>
      <div class="mt-3"><router-link to="/staff/treks" class="btn btn-success">Manage treks</router-link></div>
    </div>
  </div>`,
  setup() {
    const d = Vue.ref(null);
    Vue.onMounted(async () => { d.value = await api.get("/api/staff/dashboard"); });
    return { d, fmtDate };
  },
};
