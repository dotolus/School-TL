async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getTimeline: () => request("/timeline"),
  addItem: (item) => request("/timeline/items", { method: "POST", body: JSON.stringify(item) }),
  updateItem: (id, item) => request(`/timeline/items/${id}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteItem: (id) => request(`/timeline/items/${id}`, { method: "DELETE" }),

  getThemes: () => request("/themes"),
  setActiveTheme: (id) => request("/themes/active", { method: "PUT", body: JSON.stringify({ id }) }),

  login: (password) => request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
};
