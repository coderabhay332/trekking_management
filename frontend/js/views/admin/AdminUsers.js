import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, Modal, fmtDate, debounce } from "../../components/Common.js";

export default {
  components: { StatusBadge, Modal },
  template: `
  <div class="container py-4">
    <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Users</h4>
      <div class="d-flex gap-2">
        <input class="form-control" placeholder="Search name, email or ID" v-model="q" @input="search">
        <select class="form-select" v-model="role" @change="load" style="width:auto">
          <option value="">All roles</option><option value="trekker">Trekkers</option><option value="staff">Staff</option>
        </select>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>State</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td><td>{{ u.name }}</td><td>{{ u.email }}</td><td class="text-capitalize">{{ u.role }}</td>
            <td>{{ fmtDate(u.created_at) }}</td>
            <td>
              <span v-if="u.is_blacklisted" class="badge text-bg-danger">Blacklisted</span>
              <span v-else-if="!u.is_active" class="badge text-bg-secondary">Inactive</span>
              <span v-else class="badge text-bg-success">Active</span>
            </td>
            <td class="text-nowrap">
              <button v-if="u.role === 'trekker'" class="btn btn-sm btn-outline-secondary me-1" @click="showHistory(u)">History</button>
              <button class="btn btn-sm btn-outline-warning me-1" @click="act(u, u.is_active ? 'deactivate' : 'activate')">{{ u.is_active ? 'Deactivate' : 'Activate' }}</button>
              <button class="btn btn-sm btn-outline-danger" @click="act(u, u.is_blacklisted ? 'unblacklist' : 'blacklist')">{{ u.is_blacklisted ? 'Unblacklist' : 'Blacklist' }}</button>
            </td>
          </tr>
          <tr v-if="!users.length"><td colspan="7" class="text-center text-muted py-4">No users found</td></tr>
        </tbody>
      </table>
    </div>
    <modal v-if="hist" :title="'Trekking history - ' + hist.user.name" size="lg" @close="hist = null">
      <table class="table table-sm align-middle mb-0">
        <thead><tr><th>Trek</th><th>Location</th><th>Dates</th><th>Booking</th><th>Trek status</th></tr></thead>
        <tbody>
          <tr v-for="b in hist.history" :key="b.id">
            <td>{{ b.trek_name }}</td><td>{{ b.location }}</td>
            <td class="small">{{ fmtDate(b.start_date) }} - {{ fmtDate(b.end_date) }}</td>
            <td><status-badge :value="b.status"></status-badge></td>
            <td><status-badge :value="b.trek_status"></status-badge></td>
          </tr>
          <tr v-if="!hist.history.length"><td colspan="5" class="text-center text-muted">No history</td></tr>
        </tbody>
      </table>
    </modal>
  </div>`,
  setup() {
    const users = Vue.ref([]);
    const q = Vue.ref("");
    const role = Vue.ref("");
    const hist = Vue.ref(null);
    const load = async () => {
      users.value = await api.get(`/api/admin/users?q=${encodeURIComponent(q.value)}&role=${role.value}`);
    };
    const search = debounce(load);
    const act = async (u, action) => {
      try { await api.put(`/api/admin/users/${u.id}/status`, { action }); notify(`User ${action}d`); await load(); }
      catch (e) { notify(e.message, "danger"); }
    };
    const showHistory = async (u) => { hist.value = await api.get(`/api/admin/users/${u.id}/history`); };
    Vue.onMounted(load);
    return { users, q, role, hist, load, search, act, showHistory, fmtDate };
  },
};
