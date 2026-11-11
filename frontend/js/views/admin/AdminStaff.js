import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, Modal, debounce } from "../../components/Common.js";

const blank = () => ({ id: null, name: "", email: "", password: "", contact: "", specialization: "", experience_years: 0 });

export default {
  components: { StatusBadge, Modal },
  template: `
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Trek Staff</h4>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Search name, email or ID" v-model="q" @input="search">
        <button class="btn btn-success text-nowrap" @click="openForm()"><i class="bi bi-plus-lg"></i> Add staff</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Contact</th><th>Specialization</th><th>Assigned treks</th><th>Status</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in staff" :key="s.id">
            <td>{{ s.id }}</td><td>{{ s.name }}</td><td>{{ s.email }}</td><td>{{ s.contact || '-' }}</td><td>{{ s.specialization || '-' }}</td>
            <td class="small">{{ s.assigned_treks.map(t => t.name).join(', ') || '-' }}</td>
            <td>
              <status-badge :value="s.is_blacklisted ? 'Cancelled' : (s.is_active ? 'Active' : 'Inactive')"></status-badge>
              <span v-if="s.is_blacklisted" class="small text-danger">Blacklisted</span>
            </td>
            <td class="text-nowrap">
              <button class="btn btn-sm btn-outline-primary me-1" @click="openForm(s)"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-warning me-1" @click="act(s, s.is_active ? 'deactivate' : 'activate')">{{ s.is_active ? 'Deactivate' : 'Activate' }}</button>
              <button class="btn btn-sm btn-outline-danger" @click="act(s, s.is_blacklisted ? 'unblacklist' : 'blacklist')">{{ s.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}</button>
            </td>
          </tr>
          <tr v-if="!staff.length"><td colspan="8" class="text-center text-muted py-4">No staff found</td></tr>
        </tbody>
      </table>
    </div>

    <modal v-if="form" :title="form.id ? 'Edit staff' : 'Add staff'" @close="form = null">
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
      <form @submit.prevent="save" class="row g-3">
        <div class="col-12"><label class="form-label">Name</label><input class="form-control" v-model.trim="form.name" required></div>
        <div class="col-12"><label class="form-label">Email</label><input type="email" class="form-control" v-model.trim="form.email" :disabled="!!form.id" required></div>
        <div class="col-12"><label class="form-label">Password <span v-if="form.id" class="small text-muted">(leave blank to keep)</span></label>
          <input type="password" class="form-control" v-model="form.password" minlength="6" :required="!form.id" autocomplete="new-password"></div>
        <div class="col-md-6"><label class="form-label">Contact</label><input class="form-control" v-model.trim="form.contact" pattern="[0-9+\\-\\s]{7,20}" title="7-20 digits"></div>
        <div class="col-md-6"><label class="form-label">Experience (years)</label><input type="number" min="0" class="form-control" v-model.number="form.experience_years"></div>
        <div class="col-12"><label class="form-label">Specialization</label><input class="form-control" v-model.trim="form.specialization"></div>
        <div class="col-12 text-end"><button class="btn btn-success">Save</button></div>
      </form>
    </modal>
  </div>`,
  setup() {
    const staff = Vue.ref([]);
    const q = Vue.ref("");
    const form = Vue.ref(null);
    const error = Vue.ref("");

    const load = async () => { staff.value = await api.get(`/api/admin/staff?q=${encodeURIComponent(q.value)}`); };
    const search = debounce(load);
    const openForm = (s) => {
      error.value = "";
      form.value = s ? { ...s, password: "" } : blank();
    };
    const save = async () => {
      error.value = "";
      const body = { ...form.value };
      if (!body.password) delete body.password;
      try {
        if (body.id) await api.put(`/api/admin/staff/${body.id}`, body);
        else await api.post("/api/admin/staff", body);
        notify("Staff saved");
        form.value = null;
        await load();
      } catch (e) { error.value = e.message; }
    };
    const act = async (s, action) => {
      try { await api.put(`/api/admin/users/${s.user_id}/status`, { action }); notify(`Staff ${action}d`); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    Vue.onMounted(load);
    return { staff, q, form, error, search, openForm, save, act };
  },
};
