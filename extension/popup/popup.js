const API_BASE_URL = "http://localhost:8000";
const API_TOKEN = "test_token_123";

let currentTab = null;
let extractedData = null;
let pendingSaveData = null;
let autoSaveTimeout = null;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isTab = urlParams.get("tab") === "1";

  const loadingEl = document.getElementById("loading");
  const formEl = document.getElementById("job-form");
  const errorEl = document.getElementById("error");
  const errorMessageEl = document.getElementById("error-message");

  if (isTab) {
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

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: "extractJobData",
    });

    if (response && response.success) {
      extractedData = response.data;
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

  await loadEmails();
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
    document.getElementById("salary_range").value = data.salary || "";
    document.getElementById("job_description").value = data.description || "";
    document.getElementById("job_url").value = data.url || "";

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date_applied").value = today;

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
  if (currentVal) {
    select.value = currentVal;
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
    salary_range: formData.get("salary_range") || null,
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
    const response = await fetch(`${API_BASE_URL}/api/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 401) {
      throw new Error("Authentication failed. Please check your API token.");
    }

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
