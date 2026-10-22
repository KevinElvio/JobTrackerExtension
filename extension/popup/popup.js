const DEFAULT_API_URL = "http://localhost:8000";

let API_BASE_URL = DEFAULT_API_URL;

let currentTab = null;
let extractedData = null;
let pendingSaveData = null;
let autoSaveTimeout = null;

function getLocalDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date - offset).toISOString().slice(0, 10);
}

function formatSalaryRange(value) {
  const text = value.trim();
  if (!/\bIDR\b|\bRp\.?/i.test(text)) return text;
  const amounts = text.match(/\d[\d.,]*/g);
  if (!amounts?.length) return text;
  const formatted = amounts.slice(0, 2).map((amount) => {
    const digits = amount.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
  return `IDR ${formatted.join(" - ")}`;
}

async function probeApi(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);
  try {
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveApiBaseUrl() {
  const stored = await new Promise((resolve) =>
    chrome.storage.local.get(["api_url"], (result) => resolve(result.api_url || null))
  );

  const candidates = stored ? [stored, DEFAULT_API_URL] : [DEFAULT_API_URL];
  for (const candidate of candidates) {
    if (await probeApi(candidate)) {
      API_BASE_URL = candidate;
      if (candidate !== stored) {
        await chrome.storage.local.set({ api_url: candidate });
      }
      return candidate;
    }
  }

  API_BASE_URL = stored || DEFAULT_API_URL;
  return null;
}

async function recoverApiUrl() {
  await chrome.storage.local.remove(["api_url"]);
  return resolveApiBaseUrl();
}

async function postApplication(data) {
  const send = () =>
    fetch(`${API_BASE_URL}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

  try {
    return await send();
  } catch (err) {
    const recovered = await recoverApiUrl();
    if (!recovered) throw err;
    return send();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isTab = urlParams.get("tab") === "1";

  const loadingEl = document.getElementById("loading");
  const formEl = document.getElementById("job-form");
  const errorEl = document.getElementById("error");
  const errorMessageEl = document.getElementById("error-message");
  const apiResolved = await resolveApiBaseUrl();

  if (isTab) {
    if (!apiResolved) {
      loadingEl.style.display = "none";
      errorEl.style.display = "block";
      errorMessageEl.textContent = "Job Tracker backend not found. Reopen the extension popup to set the backend URL.";
      return;
    }
    const saved = await getSavedFormData();
    if (saved) {
      await loadEmails();
      restoreFormFromData(saved);
      loadingEl.style.display = "none";
      formEl.style.display = "block";
    } else {
      loadingEl.style.display = "none";
      errorEl.style.display = "block";
      errorMessageEl.textContent = "No saved data found. Please use the extension popup first.";
    }
    setupEventListeners();
    setupAutoSave();
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (!apiResolved) {
    loadingEl.style.display = "none";
    document.getElementById("settings-warning").style.display = "block";
    document.getElementById("settings-panel").style.display = "block";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: "extractJobData",
    });

    if (response && response.success) {
      extractedData = response.data;
      await loadEmails();
      await populateForm(extractedData);
      loadingEl.style.display = "none";
      formEl.style.display = "block";
      document.getElementById("open-tab-bar").style.display = "block";
    } else {
      throw new Error(response?.error || "Failed to extract job data.");
    }
  } catch (err) {
    loadingEl.style.display = "none";
    errorEl.style.display = "block";
    errorMessageEl.textContent = err.message || "Could not extract job information from this page.";
  }

  setupEventListeners();
  setupAutoSave();
});

async function populateForm(data) {
  const saved = await getSavedFormData();

  if (saved && saved.job_url === data.url) {
    document.getElementById("job_role").value = saved.job_role || "";
    document.getElementById("company_name").value = saved.company_name || "";
    document.getElementById("location").value = saved.location || "";
    document.getElementById("date_applied").value = saved.date_applied || "";
    document.getElementById("application_email").value = saved.application_email || "";
    document.getElementById("application_platform").value = saved.application_platform || "LinkedIn";
    document.getElementById("employment_type").value = saved.employment_type || "";
    document.getElementById("salary_range").value = saved.salary_range || "";
    document.getElementById("job_description").value = saved.job_description || "";
    document.getElementById("job_url").value = saved.job_url || "";
    document.getElementById("status").value = saved.status || "Applied";
    document.getElementById("notes").value = saved.notes || "";
  } else {
    document.getElementById("job_role").value = data.role || "";
    document.getElementById("company_name").value = data.company || "";
    document.getElementById("location").value = data.location || "";
    document.getElementById("salary_range").value = formatSalaryRange(data.salary || "");
    document.getElementById("job_description").value = data.description || "";
    document.getElementById("job_url").value = data.url || "";

    document.getElementById("date_applied").value = getLocalDate();

    if (data.platform) {
      const platformSelect = document.getElementById("application_platform");
      const option = Array.from(platformSelect.options).find(
        (opt) => opt.value === data.platform
      );
      if (option) {
        platformSelect.value = data.platform;
      }
    }

    if (data.employment_type) {
      const typeSelect = document.getElementById("employment_type");
      const option = Array.from(typeSelect.options).find(
        (opt) => opt.value === data.employment_type
      );
      if (option) {
        typeSelect.value = data.employment_type;
      }
    }
  }
}

async function loadEmails() {
  const emails = await EmailStorage.getEmails();
  const select = document.getElementById("application_email");
  const currentVal = select.value;
  select.innerHTML = '<option value="">Select email...</option>';
  emails.forEach((email) => {
    const option = document.createElement("option");
    option.value = email;
    option.textContent = email;
    select.appendChild(option);
  });
  if (currentVal && emails.includes(currentVal)) {
    select.value = currentVal;
  } else if (emails.length) {
    select.value = emails[emails.length - 1];
  }
}

function setupEventListeners() {
  document.getElementById("add-email-btn").addEventListener("click", () => {
    const group = document.getElementById("new-email-group");
    group.style.display = group.style.display === "none" ? "block" : "none";
  });

  document.getElementById("save-email-btn").addEventListener("click", async () => {
    const input = document.getElementById("new_email");
    const email = input.value.trim();
    if (email && EmailStorage.isValidEmail(email)) {
      await EmailStorage.addEmail(email);
      await loadEmails();
      input.value = "";
      document.getElementById("new-email-group").style.display = "none";
      document.getElementById("application_email").value = email;
    }
  });

  document.getElementById("salary_range").addEventListener("change", (event) => {
    event.target.value = formatSalaryRange(event.target.value);
  });

  document.getElementById("cancel-btn").addEventListener("click", async () => {
    await clearSavedFormData();
    window.close();
  });

  document.getElementById("job-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveApplication(false);
  });

  document.getElementById("cancel-duplicate-btn").addEventListener("click", () => {
    document.getElementById("duplicate-warning").style.display = "none";
    document.getElementById("job-form").style.display = "block";
  });

  document.getElementById("force-save-btn").addEventListener("click", async () => {
    document.getElementById("duplicate-warning").style.display = "none";
    await saveApplication(true);
  });

  document.getElementById("open-tab-btn").addEventListener("click", () => {
    openInTab();
  });

  const autofillBtn = document.getElementById("autofill-btn");
  if (autofillBtn) {
    autofillBtn.addEventListener("click", async () => {
      autofillBtn.disabled = true;
      autofillBtn.textContent = "Filling...";
      try {
        const response = await chrome.runtime.sendMessage({
          action: "autofill",
          tabId: currentTab.id,
          apiUrl: API_BASE_URL,
        });
        if (response && response.success) {
          if (!response.filled) {
            alert("Autofill ran, but 0 fields were filled. Make sure your profile is saved, the page is refreshed, and the form is not inside an unsupported widget.");
          } else {
            alert(`Filled ${response.filled} field(s).`);
          }
        } else {
          alert(`Autofill failed: ${response?.error || "Unknown error"}`);
        }
      } catch (err) {
        alert(`Autofill error: ${err.message}`);
      } finally {
        autofillBtn.disabled = false;
        autofillBtn.textContent = "✨ Autofill";
      }
    });
  }

  document.getElementById("open-settings-btn").addEventListener("click", () => {
    document.getElementById("job-form").style.display = "none";
    document.getElementById("error").style.display = "none";
    document.getElementById("duplicate-warning").style.display = "none";

    document.getElementById("setting_api_url").value = API_BASE_URL;
    document.getElementById("settings-warning").style.display = "none";
    document.getElementById("settings-panel").style.display = "block";
  });

  document.getElementById("cancel-settings-btn").addEventListener("click", async () => {
    document.getElementById("settings-panel").style.display = "none";
    const connected = await resolveApiBaseUrl();
    if (connected) {
      document.getElementById("job-form").style.display = "block";
    } else {
      document.getElementById("error").style.display = "block";
      document.getElementById("error-message").textContent =
        "Job Tracker backend not found. Make sure Docker is running, then reopen the extension.";
    }
  });

  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const newUrl = document.getElementById("setting_api_url").value.trim() || DEFAULT_API_URL;
    document.getElementById("settings-warning").style.display = "none";

    if (!(await probeApi(newUrl))) {
      document.getElementById("settings-warning").style.display = "block";
      return;
    }

    await chrome.storage.local.set({ api_url: newUrl });
    API_BASE_URL = newUrl;

    document.getElementById("settings-panel").style.display = "none";
    location.reload();
  });
}

function setupAutoSave() {
  const form = document.getElementById("job-form");
  const inputs = form.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        saveFormData();
      }, 500);
    });
    input.addEventListener("change", () => {
      saveFormData();
    });
  });
}

async function saveFormData() {
  const form = document.getElementById("job-form");
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  await chrome.storage.local.set({ savedFormData: data });
}

async function getSavedFormData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["savedFormData"], (result) => {
      resolve(result.savedFormData || null);
    });
  });
}

async function clearSavedFormData() {
  await chrome.storage.local.remove(["savedFormData"]);
}

function openInTab() {
  saveFormData();
  chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html?tab=1") });
  window.close();
}

function restoreFormFromData(data) {
  document.getElementById("job_role").value = data.job_role || "";
  document.getElementById("company_name").value = data.company_name || "";
  document.getElementById("location").value = data.location || "";
  document.getElementById("date_applied").value = data.date_applied || "";
  document.getElementById("application_email").value = data.application_email || "";
  document.getElementById("application_platform").value = data.application_platform || "LinkedIn";
  document.getElementById("employment_type").value = data.employment_type || "";
  document.getElementById("salary_range").value = data.salary_range || "";
  document.getElementById("job_description").value = data.job_description || "";
  document.getElementById("job_url").value = data.job_url || "";
  document.getElementById("status").value = data.status || "Applied";
  document.getElementById("notes").value = data.notes || "";
}

async function saveApplication(forceSave) {
  const form = document.getElementById("job-form");
  const formData = new FormData(form);

  const data = {
    job_role: formData.get("job_role"),
    company_name: formData.get("company_name"),
    location: formData.get("location") || null,
    date_applied: formData.get("date_applied"),
    application_email: formData.get("application_email"),
    application_platform: formData.get("application_platform"),
    employment_type: formData.get("employment_type"),
    salary_range: formatSalaryRange(formData.get("salary_range") || "") || null,
    job_description: formData.get("job_description"),
    job_url: formData.get("job_url"),
    status: "Applied",
    notes: formData.get("notes") || null,
    force_save: forceSave,
  };

  const validationError = validateApplication(data);
  if (validationError) {
    alert(validationError);
    return;
  }

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const response = await postApplication(data);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to save application.");
    }

    if (!result.success && result.code === "DUPLICATE_WARNING") {
      pendingSaveData = data;
      document.getElementById("job-form").style.display = "none";
      document.getElementById("duplicate-warning").style.display = "block";
      return;
    }

    await clearSavedFormData();
    document.getElementById("job-form").style.display = "none";
    document.getElementById("success").style.display = "block";

    setTimeout(() => window.close(), 2000);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Confirm & Save";
  }
}
