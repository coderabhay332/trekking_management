import { api } from "../../api.js";
import { StatusBadge, fmtDate } from "../../components/Common.js";

export default {
  components: { StatusBadge },
  template: `
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Trekking History</h4>
    </div>
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead><tr><th>Trek</th><th>Location</th><th>Dates</th><th>Booked on</th><th>Booking</th><th>Trek status</th><th>Completed on</th></tr></thead>
        <tbody>
          <tr v-for="b in history" :key="b.id">
            <td>{{ b.trek_name }}</td><td>{{ b.location }}</td>
            <td class="small">{{ fmtDate(b.start_date) }} - {{ fmtDate(b.end_date) }}</td>
            <td class="small">{{ fmtDate(b.booking_date) }}</td>
            <td><status-badge :value="b.status"></status-badge></td>
            <td><status-badge :value="b.trek_status"></status-badge></td>
            <td class="small">{{ b.completed_at ? fmtDate(b.completed_at) : '-' }}</td>
          </tr>
          <tr v-if="!history.length"><td colspan="7" class="text-center text-muted py-4">No trekking history yet</td></tr>
        </tbody>
      </table>
    </div>
  </div>`,
  setup() {
    const history = Vue.ref([]);
    Vue.onMounted(async () => { history.value = await api.get("/api/user/history"); });
    return { history, fmtDate };
  },
};
