import { api } from "../../api.js";
import { notify } from "../../store.js";
import { StatusBadge, fmtDate, debounce } from "../../components/Common.js";

export default {
  components: { StatusBadge },
  template: `
  <div class="container py-4">
    <h4 class="mb-3">Browse Treks</h4>
    <form class="row g-2 mb-3" @submit.prevent="load">
      <div class="col-md-3"><input class="form-control" placeholder="Search by name" v-model="f.q" @input="search"></div>
      <div class="col-md-3"><input class="form-control" placeholder="Location" v-model="f.location" @input="search"></div>
      <div class="col-6 col-md-2">
        <select class="form-select" v-model="f.difficulty" @change="load">
          <option value="">Any difficulty</option><option>Easy</option><option>Moderate</option><option>Hard</option>
        </select>
      </div>
      <div class="col-3 col-md-2"><input type="number" min="1" class="form-control" placeholder="Min days" v-model="f.min_duration" @input="search"></div>
      <div class="col-3 col-md-2"><input type="number" min="1" class="form-control" placeholder="Max days" v-model="f.max_duration" @input="search"></div>
    </form>
    <div class="row g-3">
      <div class="col-md-6 col-xl-4" v-for="t in treks" :key="t.id">
        <div class="card trek-card"><div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="card-title">{{ t.name }}</h5>
            <status-badge :value="t.status"></status-badge>
          </div>
          <p class="text-muted small mb-1"><i class="bi bi-geo-alt"></i> {{ t.location }}</p>
          <p class="small mb-1"><status-badge :value="t.difficulty"></status-badge> {{ t.duration_days }} day(s) &middot; {{ fmtDate(t.start_date) }} - {{ fmtDate(t.end_date) }}</p>
          <p class="small text-muted flex-grow-1">{{ t.description }}</p>
          <div class="d-flex justify-content-between align-items-center">
            <div><strong>{{ t.price ? '₹' + t.price : 'Free' }}</strong>
              <div class="small text-muted">{{ t.available_slots }} slot(s) left</div></div>
            <button v-if="t.already_booked" class="btn btn-outline-secondary btn-sm" disabled>Booked</button>
            <button v-else-if="t.status !== 'Open'" class="btn btn-outline-secondary btn-sm" disabled>Not open yet</button>
            <button v-else-if="t.available_slots < 1" class="btn btn-outline-danger btn-sm" disabled>Full</button>
            <button v-else class="btn btn-success btn-sm" @click="book(t)">Book now</button>
          </div>
        </div></div>
      </div>
      <div v-if="loaded && !treks.length" class="text-center text-muted py-5">No treks match your search</div>
    </div>
  </div>`,
  setup() {
    const treks = Vue.ref([]);
    const loaded = Vue.ref(false);
    const f = Vue.reactive({ q: "", location: "", difficulty: "", min_duration: "", max_duration: "" });

    const load = async () => {
      const params = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "" && v !== null));
      treks.value = await api.get(`/api/treks?${params}`);
      loaded.value = true;
    };
    const search = debounce(load);
    const book = async (t) => {
      try { await api.post(`/api/treks/${t.id}/book`); notify(`Booked ${t.name}`); await load(); }
      catch (e) { notify(e.message, "danger"); await load(); }
    };
    Vue.onMounted(load);
    return { treks, loaded, f, load, search, book, fmtDate };
  },
};
