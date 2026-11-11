import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatCard } from "../../components/Common.js";

export default {
  components: { StatCard },
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
        <div class="col-lg-6">
          <div class="card stat-card"><div class="card-body">
            <h6>Popular treks</h6>
            <table class="table table-sm mb-0"><tbody>
              <tr v-for="t in r.popular_treks" :key="t.id"><td>{{ t.name }}</td><td class="text-end">{{ t.bookings }}</td></tr>
              <tr v-if="!r.popular_treks.length"><td class="text-muted">No data</td></tr>
            </tbody></table>
          </div></div>
        </div>
        <div class="col-lg-6">
          <div class="card stat-card"><div class="card-body">
            <h6>Monthly bookings</h6>
            <table class="table table-sm mb-0"><tbody>
              <tr v-for="m in r.monthly_bookings" :key="m.month"><td>{{ m.month }}</td><td class="text-end">{{ m.count }}</td></tr>
              <tr v-if="!r.monthly_bookings.length"><td class="text-muted">No data</td></tr>
            </tbody></table>
          </div></div>
        </div>
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
