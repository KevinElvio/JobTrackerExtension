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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) currentTab = tabs[0];
    const saved = await getSavedFormData();
    if (saved) {
      await loadEmails();
      restoreFormFromData(saved);
      loadingEl.style.display = "none";
      formEl.style.display = "block";
      const captureBar = document.getElementById("capture-bar");
      if (captureBar) captureBar.style.display = "block";
      renderCaptureSelect();
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
      // Auto-apply cached AI extraction if available
      const cached = await getAiCache(extractedData.url);
      if (cached) {
        applyAiData(cached);
      }

      // Capture-first: if current page extraction incomplete, try latest captured job
      const captures = await getCaptures();
      if (isIncomplete() && captures.length > 0) {
        const latest = captures[captures.length - 1];
        applyAiData(latest.data);
        const status = document.getElementById("capture-status");
        if (status) status.textContent = `Auto-filled from captured job: ${latest.data.job_role || ""} @ ${latest.data.company_name || ""}`;
      }

      updateAiExtractBar();
      renderCaptureSelect();
      loadingEl.style.display = "none";
      formEl.style.display = "block";
      document.getElementById("open-tab-bar").style.display = "block";
      const captureBar = document.getElementById("capture-bar");
      if (captureBar) captureBar.style.display = "block";
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
  await applyDefaultEmail();
}

async function applyDefaultEmail() {
  const emailSelect = document.getElementById("application_email");
  if (!emailSelect) return;
  if (emailSelect.value.trim() !== "") return;
  const stored = await new Promise((resolve) =>
    chrome.storage.local.get(["default_email", "last_used_email"], (r) => resolve(r))
  );
  const email = stored.default_email || stored.last_used_email || "";
  if (email) {
    // ensure option exists
    if (!Array.from(emailSelect.options).some((o) => o.value === email)) {
      const opt = document.createElement("option");
      opt.value = email;
      opt.textContent = email;
      emailSelect.appendChild(opt);
    }
    emailSelect.value = email;
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

  const captureJobBtn = document.getElementById("capture-job-btn");
  if (captureJobBtn) {
    captureJobBtn.addEventListener("click", async () => {
      await runCaptureJob();
    });
  }

  const fillCaptureBtn = document.getElementById("fill-capture-btn");
  if (fillCaptureBtn) {
    fillCaptureBtn.addEventListener("click", async () => {
      await fillFromCapture();
    });
  }

  const clearCapturesBtn = document.getElementById("clear-captures-btn");
  if (clearCapturesBtn) {
    clearCapturesBtn.addEventListener("click", async () => {
      await chrome.storage.local.remove(["pendingCaptures"]);
      renderCaptureSelect();
      const status = document.getElementById("capture-status");
      if (status) status.textContent = "Captures cleared.";
    });
  }

  const aiExtractBtn = document.getElementById("ai-extract-btn");
  if (aiExtractBtn) {
    aiExtractBtn.addEventListener("click", async () => {
      await runAiExtraction();
    });
  }

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
    chrome.storage.local.get(["default_email"], (result) => {
      document.getElementById("setting_default_email").value = result.default_email || "";
    });
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

    const defaultEmail = document.getElementById("setting_default_email").value.trim();
    await chrome.storage.local.set({ default_email: defaultEmail });

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
    if (data.application_email) {
      await new Promise((resolve) =>
        chrome.storage.local.set({ last_used_email: data.application_email }, resolve)
      );
    }
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

// --- AI extraction helpers ---
async function getAiCache(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["aiExtractCache"], (result) => {
      const cache = result.aiExtractCache || {};
      resolve(cache[url] || null);
    });
  });
}

async function setAiCache(url, data) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["aiExtractCache"], (result) => {
      const cache = result.aiExtractCache || {};
      cache[url] = data;
      // Keep cache small: max 50 entries
      const keys = Object.keys(cache);
      if (keys.length > 50) {
        delete cache[keys[0]];
      }
      chrome.storage.local.set({ aiExtractCache: cache }, () => resolve());
    });
  });
}

function getFieldValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (el && value) {
    if (el.value.trim() === "") {
      el.value = value;
    }
  }
}

function isIncomplete() {
  return getFieldValue("job_role") === "" || getFieldValue("company_name") === "";
}

function updateAiExtractBar() {
  const bar = document.getElementById("ai-extract-bar");
  if (!bar) return;
  if (isIncomplete()) {
    bar.style.display = "block";
  } else {
    bar.style.display = "none";
  }
}

function applyAiData(aiData, options = {}) {
  const overwrite = !!options.overwrite;
  if (!aiData) return;
  const setField = (id, value) => {
    if (value == null) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (overwrite || el.value.trim() === "") {
      el.value = value;
    }
  };
  setField("job_role", aiData.job_role);
  setField("company_name", aiData.company_name);
  setField("location", aiData.location);
  if (aiData.salary_range) {
    const salaryEl = document.getElementById("salary_range");
    if (salaryEl && (overwrite || salaryEl.value.trim() === "")) {
      salaryEl.value = formatSalaryRange(aiData.salary_range);
    }
  }
  setField("job_description", aiData.job_description);
  if (aiData.employment_type) {
    const typeSelect = document.getElementById("employment_type");
    if (typeSelect && (overwrite || typeSelect.value === "")) {
      const option = Array.from(typeSelect.options).find((opt) => opt.value === aiData.employment_type);
      if (option) typeSelect.value = aiData.employment_type;
    }
  }
  if (aiData.application_platform) {
    const platformSelect = document.getElementById("application_platform");
    if (platformSelect && (overwrite || platformSelect.value === "")) {
      const option = Array.from(platformSelect.options).find((opt) => opt.value === aiData.application_platform);
      if (option) platformSelect.value = aiData.application_platform;
    }
  }
  updateAiExtractBar();
}

async function runAiExtraction() {
  if (!currentTab) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) currentTab = tabs[0];
  }
  if (!currentTab) throw new Error("No active tab.");
  const btn = document.getElementById("ai-extract-btn");
  const status = document.getElementById("ai-extract-status");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Extracting...";
  }
  if (status) status.textContent = "";

  try {
    // Get page text from content script
    let pageText = "";
    let pageJsonLd = null;
    let pageUrl = "";
    try {
      const res = await chrome.tabs.sendMessage(currentTab.id, { action: "getPageText" });
      if (res && res.success && res.data) {
        pageText = res.data.text || "";
        pageJsonLd = res.data.jsonLd || null;
        pageUrl = res.data.url || "";
      }
    } catch (e) {
      pageUrl = extractedData?.url || "";
    }

    if (!pageText) {
      throw new Error("Could not read page text.");
    }

    const response = await fetch(`${API_BASE_URL}/api/ai/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pageText, jsonLd: pageJsonLd, url: pageUrl }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "AI extraction failed.");
    }

    const aiData = result.data;
    applyAiData(aiData);
    if (pageUrl) await setAiCache(pageUrl, aiData);

    if (status) status.textContent = "Done.";
  } catch (err) {
    if (status) status.textContent = `Failed: ${err.message}`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "✨ Extract with AI";
    }
  }
}

// --- Capture-First helpers ---
async function getCaptures() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pendingCaptures"], (result) => {
      resolve(result.pendingCaptures || []);
    });
  });
}

async function saveCapture(data, url) {
  const captures = await getCaptures();
  const capture = {
    id: Date.now().toString(),
    url: url || data && null,
    capturedAt: new Date().toISOString(),
    data,
  };
  captures.push(capture);
  // keep last 20
  while (captures.length > 20) captures.shift();
  await new Promise((resolve) => {
    chrome.storage.local.set({ pendingCaptures: captures }, resolve);
  });
  return capture;
}

function renderCaptureSelect() {
  const select = document.getElementById("capture-select");
  if (!select) return;
  getCaptures().then((captures) => {
    select.innerHTML = "";
    if (captures.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No captures yet";
      select.appendChild(opt);
      return;
    }
    captures.slice().reverse().forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      const label = `${c.data.job_role || "?"} @ ${c.data.company_name || "?"}`;
      opt.textContent = `${label} (${new Date(c.capturedAt).toLocaleDateString()})`;
      select.appendChild(opt);
    });
  });
}

async function runCaptureJob() {
  if (!currentTab) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) currentTab = tabs[0];
  }
  if (!currentTab) {
    const status = document.getElementById("capture-status");
    if (status) status.textContent = "No active tab.";
    return;
  }
  const btn = document.getElementById("capture-job-btn");
  const status = document.getElementById("capture-status");
  if (btn) { btn.disabled = true; btn.textContent = "Capturing..."; }
  if (status) status.textContent = "";

  try {
    // Reuse AI extraction pipeline
    let pageText = "";
    let pageJsonLd = null;
    let pageUrl = "";
    try {
      const res = await chrome.tabs.sendMessage(currentTab.id, { action: "getPageText" });
      if (res && res.success && res.data) {
        pageText = res.data.text || "";
        pageJsonLd = res.data.jsonLd || null;
        pageUrl = res.data.url || "";
      }
    } catch (e) {
      pageUrl = extractedData?.url || "";
    }

    if (!pageText) throw new Error("Could not read page text.");

    const response = await fetch(`${API_BASE_URL}/api/ai/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pageText, jsonLd: pageJsonLd, url: pageUrl }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "AI extraction failed.");

    const aiData = result.data;
    // Also apply to form immediately
    applyAiData(aiData, { overwrite: true });
    await setAiCache(pageUrl, aiData);
    const capture = await saveCapture(aiData, pageUrl);
    renderCaptureSelect();

    if (status) status.textContent = `Captured: ${aiData.job_role || "?"} @ ${aiData.company_name || "?"}`;
  } catch (err) {
    if (status) status.textContent = `Failed: ${err.message}`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "📸 Capture Job (AI)"; }
  }
}

async function fillFromCapture() {
  const select = document.getElementById("capture-select");
  const status = document.getElementById("capture-status");
  const id = select ? select.value : null;
  const captures = await getCaptures();
  let capture = null;
  if (id) capture = captures.find((c) => c.id === id);
  if (!capture && captures.length > 0) capture = captures[captures.length - 1];
  if (!capture) {
    if (status) status.textContent = "No captures available.";
    return;
  }
  const ok = confirm("Overwrite form fields with captured data?");
  if (!ok) return;
  applyAiData(capture.data, { overwrite: true });
  if (status) status.textContent = `Filled from: ${capture.data.job_role || "?"} @ ${capture.data.company_name || "?"}`;
}
