import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatCard, ChartCanvas } from "../../components/Common.js";

export default {
  components: { StatCard, ChartCanvas },
  template: `
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Trekking Statistics &amp; Reports</h4>
      <button class="btn btn-outline-success" @click="sendReport"><i class="bi bi-envelope"></i> Send monthly report now</button>
    </div>
    <div v-if="r">
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><stat-card label="Treks completed" :value="r.treks_completed" icon="bi-flag"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Unique participants" :value="r.unique_participants" icon="bi-people" tone="primary"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Booked" :value="r.bookings_by_status.Booked || 0" icon="bi-ticket" tone="warning"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Cancelled" :value="r.bookings_by_status.Cancelled || 0" icon="bi-x-circle" tone="danger"></stat-card></div>
      </div>
      <div class="row g-3">
        <div class="col-lg-6"><div class="card stat-card"><div class="card-body">
          <h6>Popular treks</h6>
          <chart-canvas v-if="r.popular_treks.length" type="bar" label="Bookings" :labels="r.popular_treks.map(t => t.name)" :values="r.popular_treks.map(t => t.bookings)"></chart-canvas>
          <p v-else class="text-muted mb-0">No data</p>
        </div></div></div>
        <div class="col-lg-6"><div class="card stat-card"><div class="card-body">
          <h6>Booking trend (monthly)</h6>
          <chart-canvas v-if="r.monthly_bookings.length" type="line" label="Bookings" :labels="r.monthly_bookings.map(m => m.month)" :values="r.monthly_bookings.map(m => m.count)"></chart-canvas>
          <p v-else class="text-muted mb-0">No data</p>
        </div></div></div>
        <div class="col-lg-6"><div class="card stat-card"><div class="card-body">
          <h6>Treks by difficulty</h6>
          <chart-canvas v-if="Object.keys(r.treks_by_difficulty).length" type="doughnut" :labels="Object.keys(r.treks_by_difficulty)" :values="Object.values(r.treks_by_difficulty)"></chart-canvas>
          <p v-else class="text-muted mb-0">No data</p>
        </div></div></div>
        <div class="col-lg-6"><div class="card stat-card"><div class="card-body">
          <h6>Bookings by status</h6>
          <chart-canvas v-if="Object.keys(r.bookings_by_status).length" type="pie" :labels="Object.keys(r.bookings_by_status)" :values="Object.values(r.bookings_by_status)"></chart-canvas>
          <p v-else class="text-muted mb-0">No data</p>
        </div></div></div>
      </div>
    </div>
  </div>`,
  setup() {
    const r = Vue.ref(null);
    Vue.onMounted(async () => { r.value = await api.get("/api/admin/reports"); });
    const sendReport = async () => {
      try { await api.post("/api/admin/reports/monthly"); notify("Monthly report queued and will be emailed to you"); }
      catch (e) { notify(e.message, "danger"); }
    };
    return { r, sendReport };
  },
};
