import { session } from "./api.js";

const { reactive } = Vue;

export const state = reactive({
  user: session.user,
  toasts: [],
});

export function setUser(user, token) {
  if (token) session.save(token, user);
  else session.saveUser(user);
  state.user = user;
}

export function logout() {
  session.clear();
  state.user = null;
}

let toastId = 0;
export function notify(message, type = "success") {
  const id = ++toastId;
  state.toasts.push({ id, message, type });
  setTimeout(() => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
  }, 4000);
}

export function homeFor(role) {
  return { admin: "/admin", staff: "/staff", trekker: "/user" }[role] || "/login";
}
