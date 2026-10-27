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
  importTimeline: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/timeline/import", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `Request failed: ${res.status}`);
      err.details = body.details;
      throw err;
    }
    return body;
  },

  getThemes: () => request("/themes"),
  setActiveTheme: (id) => request("/themes/active", { method: "PUT", body: JSON.stringify({ id }) }),

  login: (password) => request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  uploadItemAttachment: async (itemId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/timeline/items/${itemId}/attachments`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  deleteItemAttachment: (itemId, attachmentId) =>
    request(`/timeline/items/${itemId}/attachments/${attachmentId}`, { method: "DELETE" }),

  getHistory: ({ itemId, limit } = {}) => {
    const params = new URLSearchParams();
    if (itemId) params.set("itemId", itemId);
    if (limit) params.set("limit", limit);
    const qs = params.toString();
    return request(`/history${qs ? `?${qs}` : ""}`);
  },
  restoreHistoryEvent: (eventId) => request(`/history/${eventId}/restore`, { method: "POST" }),

  getBackups: () => request("/backup"),
  createBackup: () => request("/backup", { method: "POST" }),
  restoreBackup: (id) => request(`/backup/${id}/restore`, { method: "POST" }),
};
