import { api, download } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, fmtDate } from "../../components/Common.js";

export default {
  components: { StatusBadge },
  template: `
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Trekking History</h4>
      <button class="btn btn-outline-success" :disabled="exporting" @click="exportCsv">
        <span v-if="exporting" class="spinner-border spinner-border-sm"></span>
        <i v-else class="bi bi-download"></i> {{ exporting ? "Preparing..." : "Export CSV" }}
      </button>
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
    const exporting = Vue.ref(false);

    const exportCsv = async () => {
      exporting.value = true;
      try {
        const { task_id } = await api.post("/api/user/export");
        notify("Export started. We'll alert you when it's ready.", "info");
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const status = await api.get(`/api/user/export/${task_id}`);
          if (status.state === "SUCCESS") {
            await download(`/api/user/export/${task_id}/download`, status.filename);
            notify(`Export complete: ${status.records} record(s) downloaded`);
            return;
          }
        }
        notify("Export is taking longer than expected. Please try again.", "warning");
      } catch (e) {
        notify(e.message, "danger");
      } finally {
        exporting.value = false;
      }
    };
    Vue.onMounted(async () => { history.value = await api.get("/api/user/history"); });
    return { history, exporting, exportCsv, fmtDate };
  },
};
