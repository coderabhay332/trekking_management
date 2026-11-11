import { api } from "../api.js";
import { StatCard, ChartCanvas } from "../components/Common.js";

export default {
  components: { StatCard, ChartCanvas },
  template: `
  <div>
    <section class="hero py-5">
      <div class="container text-center py-4">
        <h1 class="display-5 fw-bold">Discover your next trek</h1>
        <p class="lead">Browse guided treks, book your slot and track your trekking journey.</p>
        <router-link to="/register" class="btn btn-light btn-lg me-2">Get started</router-link>
        <router-link to="/login" class="btn btn-outline-light btn-lg">Login</router-link>
      </div>
    </section>
    <div class="container py-4" v-if="s">
      <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3"><stat-card label="Treks" :value="s.total_treks" icon="bi-signpost-split"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Open for booking" :value="s.open_treks" icon="bi-unlock" tone="primary"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Treks completed" :value="s.completed_treks" icon="bi-flag" tone="warning"></stat-card></div>
        <div class="col-6 col-lg-3"><stat-card label="Trekkers" :value="s.trekkers" icon="bi-people" tone="danger"></stat-card></div>
      </div>
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card stat-card"><div class="card-body">
            <h6>Most popular treks</h6>
            <chart-canvas v-if="s.popular_treks.length" type="bar" label="Bookings" :labels="s.popular_treks.map(t => t.name)" :values="s.popular_treks.map(t => t.bookings)"></chart-canvas>
            <p v-else class="text-muted mb-0">No bookings yet</p>
          </div></div>
        </div>
        <div class="col-lg-5">
          <div class="card stat-card"><div class="card-body">
            <h6>Treks by difficulty</h6>
            <chart-canvas v-if="Object.keys(s.treks_by_difficulty).length" type="doughnut" :labels="Object.keys(s.treks_by_difficulty)" :values="Object.values(s.treks_by_difficulty)"></chart-canvas>
            <p v-else class="text-muted mb-0">No treks yet</p>
          </div></div>
        </div>
      </div>
    </div>
  </div>`,
  setup() {
    const s = Vue.ref(null);
    Vue.onMounted(async () => {
      try { s.value = await api.get("/api/public/stats"); } catch (e) { s.value = null; }
    });
    return { s };
  },
};
