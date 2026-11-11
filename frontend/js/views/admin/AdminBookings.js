import { api } from "../../api.js";
import { StatusBadge, fmtDate, debounce } from "../../components/Common.js";

export default {
  components: { StatusBadge },
  template: `
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="mb-0">All Bookings &amp; History</h4>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Search user, email or trek" v-model="q" @input="search">
        <select class="form-select" v-model="status" @change="load" style="width:auto">
          <option value="">All</option><option>Booked</option><option>Cancelled</option><option>Completed</option>
        </select>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Trekker</th><th>Trek</th><th>Trek dates</th><th>Booked on</th><th>Booking</th><th>Payment</th><th>Trek status</th></tr></thead>
        <tbody>
          <tr v-for="b in bookings" :key="b.id">
            <td>{{ b.id }}</td>
            <td>{{ b.user_name }}<div class="small text-muted">{{ b.user_email }}</div></td>
            <td>{{ b.trek_name }}<div class="small text-muted">{{ b.location }}</div></td>
            <td class="small">{{ fmtDate(b.start_date) }} - {{ fmtDate(b.end_date) }}</td>
            <td class="small">{{ fmtDate(b.booking_date) }}</td>
            <td><status-badge :value="b.status"></status-badge></td>
            <td><status-badge :value="b.payment_status"></status-badge></td>
            <td><status-badge :value="b.trek_status"></status-badge></td>
          </tr>
          <tr v-if="!bookings.length"><td colspan="8" class="text-center text-muted py-4">No bookings found</td></tr>
        </tbody>
      </table>
    </div>
  </div>`,
  setup() {
    const bookings = Vue.ref([]);
    const q = Vue.ref("");
    const status = Vue.ref("");
    const load = async () => {
      bookings.value = await api.get(`/api/admin/bookings?q=${encodeURIComponent(q.value)}&status=${status.value}`);
    };
    const search = debounce(load);
    Vue.onMounted(load);
    return { bookings, q, status, load, search, fmtDate };
  },
};
