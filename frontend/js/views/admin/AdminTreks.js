import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, Modal, fmtDate, debounce } from "../../components/Common.js";

const blank = () => ({
  id: null, name: "", location: "", difficulty: "Easy", duration_days: "", total_slots: 10,
  start_date: "", end_date: "", price: 0, description: "", instructions: "", status: "Pending",
});

export default {
  components: { StatusBadge, Modal },
  template: `
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Treks</h4>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Search name, location or ID" v-model="q" @input="search">
        <select class="form-select" v-model="statusFilter" @change="load" style="width:auto">
          <option value="">All</option>
          <option v-for="s in statuses" :key="s">{{ s }}</option>
        </select>
        <button class="btn btn-success text-nowrap" @click="openForm()"><i class="bi bi-plus-lg"></i> New</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Name</th><th>Location</th><th>Level</th><th>Dates</th><th>Slots</th><th>Staff</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="t in treks" :key="t.id">
            <td>{{ t.id }}</td>
            <td>{{ t.name }}</td>
            <td>{{ t.location }}</td>
            <td><status-badge :value="t.difficulty"></status-badge></td>
            <td class="small">{{ fmtDate(t.start_date) }} - {{ fmtDate(t.end_date) }}</td>
            <td>{{ t.available_slots }}/{{ t.total_slots }}</td>
            <td>
              <select class="form-select form-select-sm" :value="t.staff_id || ''" @change="assign(t, $event.target.value)">
                <option value="">Unassigned</option>
                <option v-for="s in activeStaff" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </td>
            <td><status-badge :value="t.status"></status-badge></td>
            <td class="text-nowrap">
              <button class="btn btn-sm btn-outline-primary me-1" @click="openForm(t)"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger" @click="remove(t)"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
          <tr v-if="!treks.length"><td colspan="9" class="text-center text-muted py-4">No treks found</td></tr>
        </tbody>
      </table>
    </div>

    <modal v-if="form" :title="form.id ? 'Edit trek' : 'New trek'" size="lg" @close="form = null">
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <form @submit.prevent="save" class="row g-3">
        <div class="col-md-6"><label class="form-label">Name</label><input class="form-control" v-model.trim="form.name" required></div>
        <div class="col-md-6"><label class="form-label">Location</label><input class="form-control" v-model.trim="form.location" required></div>
        <div class="col-md-4"><label class="form-label">Difficulty</label>
          <select class="form-select" v-model="form.difficulty"><option>Easy</option><option>Moderate</option><option>Hard</option></select></div>
        <div class="col-md-4"><label class="form-label">Total slots</label><input type="number" min="1" class="form-control" v-model.number="form.total_slots" required></div>
        <div class="col-md-4"><label class="form-label">Price</label><input type="number" min="0" step="0.01" class="form-control" v-model.number="form.price"></div>
        <div class="col-md-4"><label class="form-label">Start date</label><input type="date" class="form-control" v-model="form.start_date" required></div>
        <div class="col-md-4"><label class="form-label">End date</label><input type="date" class="form-control" v-model="form.end_date" :min="form.start_date" required></div>
        <div class="col-md-4"><label class="form-label">Duration (days)</label><input type="number" min="1" class="form-control" v-model.number="form.duration_days" placeholder="Auto"></div>
        <div class="col-md-6" v-if="form.id"><label class="form-label">Status</label>
          <select class="form-select" v-model="form.status"><option v-for="s in statuses" :key="s">{{ s }}</option></select></div>
        <div class="col-12"><label class="form-label">Description</label><textarea rows="2" class="form-control" v-model="form.description"></textarea></div>
        <div class="col-12"><label class="form-label">Instructions for trekkers</label><textarea rows="2" class="form-control" v-model="form.instructions"></textarea></div>
        <div class="col-12 text-end"><button class="btn btn-success">Save</button></div>
      </form>
    </modal>
  </div>`,
  setup() {
    const treks = Vue.ref([]);
    const staff = Vue.ref([]);
    const q = Vue.ref("");
    const statusFilter = Vue.ref("");
    const form = Vue.ref(null);
    const error = Vue.ref("");
    const statuses = ["Pending", "Approved", "Open", "Closed", "Ongoing", "Completed"];
    const activeStaff = Vue.computed(() => staff.value.filter((s) => s.is_active && !s.is_blacklisted && s.status === "Active"));

    const load = async () => {
      const params = new URLSearchParams({ q: q.value, status: statusFilter.value });
      treks.value = await api.get(`/api/admin/treks?${params}`);
    };
    const search = debounce(load);
    const loadStaff = async () => { staff.value = await api.get("/api/admin/staff"); };

    const openForm = (t) => {
      error.value = "";
      form.value = t ? { ...t } : blank();
    };
    const save = async () => {
      error.value = "";
      const body = { ...form.value };
      if (!body.duration_days) delete body.duration_days;
      try {
        if (body.id) await api.put(`/api/admin/treks/${body.id}`, body);
        else await api.post("/api/admin/treks", body);
        notify("Trek saved");
        form.value = null;
        await load();
      } catch (e) { error.value = e.message; }
    };
    const remove = async (t) => {
      if (!confirm(`Remove trek "${t.name}"?`)) return;
      try { await api.del(`/api/admin/treks/${t.id}`); notify("Trek removed"); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    const assign = async (t, staffId) => {
      try {
        await api.put(`/api/admin/treks/${t.id}/assign`, { staff_id: staffId || null });
        notify("Staff assignment updated");
        await load();
      } catch (e) { notify(e.message, "danger"); await load(); }
    };

    Vue.onMounted(async () => { await Promise.all([load(), loadStaff()]); });
    return { treks, q, statusFilter, form, error, statuses, activeStaff, load, search, openForm, save, remove, assign, fmtDate };
  },
};
