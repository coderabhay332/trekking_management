import { api } from "../../api.js";
import { StatCard, StatusBadge, fmtDate } from "../../components/Common.js";

export default {
  components: { StatCard, StatusBadge },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">My Dashboard</h4>
    <div v-if="d">
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><stat-card label="Available treks" :value="d.available_treks" icon="bi-signpost-split"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Booked" :value="d.booked_count" icon="bi-ticket-perforated" tone="primary"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Completed" :value="d.completed_count" icon="bi-flag" tone="warning"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Cancelled" :value="d.cancelled_count" icon="bi-x-circle" tone="danger"></stat-card></div>
      </div>
      <h5>Upcoming booked treks</h5>
      <div class="table-responsive mb-3">
        <table class="table align-middle mb-0">
          <thead><tr><th>Trek</th><th>Location</th><th>Dates</th><th>Trek status</th><th>Payment</th></tr></thead>
          <tbody>
            <tr v-for="b in d.booked_treks" :key="b.id">
              <td>{{ b.trek_name }}</td><td>{{ b.location }}</td>
              <td class="small">{{ fmtDate(b.start_date) }} - {{ fmtDate(b.end_date) }}</td>
              <td><status-badge :value="b.trek_status"></status-badge></td>
              <td><status-badge :value="b.payment_status"></status-badge></td>
            </tr>
            <tr v-if="!d.booked_treks.length"><td colspan="5" class="text-center text-muted py-4">No active bookings</td></tr>
          </tbody>
        </table>
      </div>
      <router-link to="/user/treks" class="btn btn-success">Browse treks</router-link>
    </div>
  </div>`,
  setup() {
    const d = Vue.ref(null);
    Vue.onMounted(async () => { d.value = await api.get("/api/user/dashboard"); });
    return { d, fmtDate };
  },
};
