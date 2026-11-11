import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, fmtDate } from "../../components/Common.js";

export default {
  components: { StatusBadge },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">My Bookings</h4>
    <div class="table-responsive">
      <table class="table align-middle mb-0">
        <thead><tr><th>Trek</th><th>Location</th><th>Dates</th><th>Trek status</th><th>Amount</th><th>Payment</th><th></th></tr></thead>
        <tbody>
          <tr v-for="b in bookings" :key="b.id">
            <td>{{ b.trek_name }}</td><td>{{ b.location }}</td>
            <td class="small">{{ fmtDate(b.start_date) }} - {{ fmtDate(b.end_date) }}</td>
            <td><status-badge :value="b.trek_status"></status-badge></td>
            <td>{{ b.amount ? '₹' + b.amount : 'Free' }}</td>
            <td><status-badge :value="b.payment_status"></status-badge></td>
            <td class="text-nowrap">
              <button v-if="b.payment_status === 'Pending' && b.amount" class="btn btn-sm btn-success me-1" @click="pay(b)">Pay</button>
              <button v-if="!['Ongoing','Completed'].includes(b.trek_status)" class="btn btn-sm btn-outline-danger" @click="cancel(b)">Cancel</button>
            </td>
          </tr>
          <tr v-if="!bookings.length"><td colspan="7" class="text-center text-muted py-4">No active bookings</td></tr>
        </tbody>
      </table>
    </div>
  </div>`,
  setup() {
    const bookings = Vue.ref([]);
    const load = async () => { bookings.value = await api.get("/api/user/bookings"); };
    const cancel = async (b) => {
      if (!confirm(`Cancel booking for ${b.trek_name}?`)) return;
      try { await api.post(`/api/bookings/${b.id}/cancel`); notify("Booking cancelled"); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    const pay = async (b) => {
      try { await api.post(`/api/bookings/${b.id}/pay`); notify("Payment successful"); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    Vue.onMounted(load);
    return { bookings, cancel, pay, fmtDate };
  },
};
