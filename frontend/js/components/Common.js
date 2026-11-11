const STATUS_COLORS = {
  Pending: "secondary",
  Approved: "info",
  Open: "success",
  Closed: "warning",
  Ongoing: "primary",
  Completed: "dark",
  Booked: "success",
  Cancelled: "danger",
  Paid: "success",
  Refunded: "info",
  Active: "success",
  Inactive: "secondary",
  Easy: "success",
  Moderate: "warning",
  Hard: "danger",
};

export const StatusBadge = {
  props: ["value"],
  template: `<span class="badge badge-status" :class="'text-bg-' + (color[value] || 'secondary')">{{ value }}</span>`,
  setup() {
    return { color: STATUS_COLORS };
  },
};

export const StatCard = {
  props: ["label", "value", "icon", "tone"],
  template: `
  <div class="card stat-card h-100">
    <div class="card-body d-flex justify-content-between align-items-center">
      <div>
        <div class="text-muted small">{{ label }}</div>
        <div class="stat-value">{{ value }}</div>
      </div>
      <i :class="['bi', icon || 'bi-bar-chart', 'fs-1', 'text-' + (tone || 'success')]"></i>
    </div>
  </div>`,
};

export const Modal = {
  props: ["title", "size"],
  emits: ["close"],
  template: `
  <div class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,.5)" @click.self="$emit('close')">
    <div class="modal-dialog modal-dialog-scrollable" :class="size ? 'modal-' + size : ''">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body"><slot></slot></div>
      </div>
    </div>
  </div>`,
};

export function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const ChartCanvas = {
  props: { type: String, labels: Array, values: Array, label: String, colors: Array },
  template: `<div style="position:relative;height:260px"><canvas ref="el"></canvas></div>`,
  setup(props) {
    const el = Vue.ref(null);
    let chart = null;
    const palette = ["#2e7d32", "#0d6efd", "#ffc107", "#dc3545", "#6f42c1", "#20c997", "#fd7e14"];
    const draw = () => {
      if (chart) chart.destroy();
      const circular = ["pie", "doughnut"].includes(props.type);
      chart = new Chart(el.value, {
        type: props.type,
        data: {
          labels: props.labels,
          datasets: [{
            label: props.label,
            data: props.values,
            backgroundColor: circular ? props.colors || palette : "#2e7d32",
            borderColor: "#2e7d32",
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: circular } },
          scales: circular ? {} : { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      });
    };
    Vue.onMounted(draw);
    Vue.watch(() => [props.labels, props.values], draw);
    Vue.onBeforeUnmount(() => chart && chart.destroy());
    return { el };
  },
};