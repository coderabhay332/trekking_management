import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, Modal, fmtDate } from "../../components/Common.js";

const ACTION_LABELS = { Open: "Open bookings", Closed: "Close bookings", Ongoing: "Start trek", Completed: "Mark completed" };

export default {
  components: { StatusBadge, Modal },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">My Treks</h4>
    <div class="row g-3">
      <div class="col-md-6 col-xl-4" v-for="t in treks" :key="t.id">
        <div class="card trek-card"><div class="card-body">
          <div class="d-flex justify-content-between">
            <h5 class="card-title">{{ t.name }}</h5>
            <status-badge :value="t.status"></status-badge>
          </div>
          <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> {{ t.location }} &middot; {{ fmtDate(t.start_date) }} - {{ fmtDate(t.end_date) }}</p>
          <p class="mb-2">Registered: <strong>{{ t.registered_users }}</strong> &middot; Slots left: <strong>{{ t.available_slots }}</strong></p>
          <div class="input-group input-group-sm mb-2" v-if="!['Ongoing','Completed'].includes(t.status)">
            <span class="input-group-text">Available slots</span>
            <input type="number" min="0" class="form-control" v-model.number="slotEdits[t.id]" :placeholder="t.available_slots">
            <button class="btn btn-outline-success" @click="saveSlots(t)">Update</button>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button v-for="s in t.allowed_status" :key="s" class="btn btn-sm" :class="s === 'Completed' ? 'btn-dark' : 'btn-outline-primary'" @click="setStatus(t, s)">{{ labels[s] }}</button>
            <button class="btn btn-sm btn-outline-secondary" @click="showParticipants(t)"><i class="bi bi-people"></i> Participants</button>
          </div>
        </div></div>
      </div>
      <div v-if="loaded && !treks.length" class="text-center text-muted py-5">No treks assigned to you yet</div>
    </div>

    <modal v-if="selected" :title="'Participants - ' + selected.trek.name" size="lg" @close="selected = null">
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Payment</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in selected.participants" :key="p.booking_id">
              <td>{{ p.name }}</td><td>{{ p.email }}</td><td>{{ p.phone || '-' }}</td>
              <td><status-badge :value="p.status"></status-badge></td>
              <td><status-badge :value="p.payment_status"></status-badge></td>
              <td><button v-if="p.status === 'Booked' && !['Ongoing','Completed'].includes(selected.trek.status)" class="btn btn-sm btn-outline-danger" @click="removeParticipant(p)">Remove</button></td>
            </tr>
            <tr v-if="!selected.participants.length"><td colspan="6" class="text-center text-muted">No registrations yet</td></tr>
          </tbody>
        </table>
      </div>
    </modal>
  </div>`,
  setup() {
    const treks = Vue.ref([]);
    const loaded = Vue.ref(false);
    const selected = Vue.ref(null);
    const slotEdits = Vue.reactive({});

    const load = async () => { treks.value = await api.get("/api/staff/treks"); loaded.value = true; };
    const saveSlots = async (t) => {
      if (slotEdits[t.id] === undefined || slotEdits[t.id] === "" || slotEdits[t.id] < 0) return notify("Enter a valid slot count", "warning");
      try { await api.put(`/api/staff/treks/${t.id}/slots`, { available_slots: slotEdits[t.id] }); notify("Slots updated"); delete slotEdits[t.id]; await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    const setStatus = async (t, status) => {
      try { await api.put(`/api/staff/treks/${t.id}/status`, { status }); notify(`Trek marked ${status}`); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    const showParticipants = async (t) => { selected.value = await api.get(`/api/staff/treks/${t.id}/participants`); };
    const removeParticipant = async (p) => {
      if (!confirm(`Remove ${p.name} from this trek?`)) return;
      try {
        await api.put(`/api/staff/treks/${selected.value.trek.id}/participants/${p.booking_id}/cancel`);
        notify("Participant removed");
        await showParticipants(selected.value.trek);
        await load();
      } catch (e) { notify(e.message, "danger"); }
    };

    Vue.onMounted(load);
    return { treks, loaded, selected, slotEdits, labels: ACTION_LABELS, saveSlots, setStatus, showParticipants, removeParticipant, fmtDate };
  },
};
