const TOKEN_KEY = "tma_token";
const USER_KEY = "tma_user";

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  saveUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    if (res.status === 401 && session.token) onUnauthorized();
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function download(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${session.token}` } });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body || {}),
  put: (url, body) => request("PUT", url, body || {}),
  del: (url) => request("DELETE", url),
};
