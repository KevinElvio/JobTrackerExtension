const API_BASE = "/api";

async function request(path, options = {}) {
  try {
    const headers = {};
    if (options.body != null) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    const data = await res.json();
    return res.ok ? data : { success: false, message: data.message || "Request failed." };
  } catch {
    return { success: false, message: "Cannot connect to server." };
  }
}

async function uploadRequest(path, formData) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return res.ok ? data : { success: false, message: data.message || "Upload failed." };
  } catch {
    return { success: false, message: "Cannot connect to server." };
  }
}

export const api = {
  getApplications: () => request("/applications"),

  getApplication: (id) => request(`/applications/${id}`),

  createApplication: (data) =>
    request("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateApplication: (id, data) =>
    request(`/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteApplication: (id) =>
    request(`/applications/${id}`, { method: "DELETE" }),

  getStatistics: () => request("/statistics"),

  getTemplates: () => request("/templates"),

  getTemplate: (id) => request(`/templates/${id}`),

  createTemplate: (data) =>
    request("/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTemplate: (id, data) =>
    request(`/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id) =>
    request(`/templates/${id}`, { method: "DELETE" }),

  renderTemplate: (id, values) =>
    request(`/templates/${id}/render`, {
      method: "POST",
      body: JSON.stringify({ values }),
    }),

  previewImport: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest("/applications/preview", formData);
  },

  executeImport: (file, duplicatePolicy) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("duplicatePolicy", duplicatePolicy);
    return uploadRequest("/applications/import", formData);
  },

  downloadTemplate: async () => {
    try {
      const res = await fetch(`${API_BASE}/applications/template`);
      if (!res.ok) return { success: false, message: "Failed to download template." };
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "job_applications_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch {
      return { success: false, message: "Cannot connect to server." };
    }
  },
};
