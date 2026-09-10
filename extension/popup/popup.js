const API_BASE_URL = "http://localhost:8000";
const API_TOKEN = "YOUR_API_TOKEN_HERE";

let currentTab = null;
let extractedData = null;
let pendingSaveData = null;

document.addEventListener("DOMContentLoaded", async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  const loadingEl = document.getElementById("loading");
  const formEl = document.getElementById("job-form");
  const errorEl = document.getElementById("error");
  const errorMessageEl = document.getElementById("error-message");

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: "extractJobData",
    });

    if (response && response.success) {
      extractedData = response.data;
      populateForm(extractedData);
      loadingEl.style.display = "none";
      formEl.style.display = "block";
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
});

function populateForm(data) {
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

async function loadEmails() {
  const emails = await EmailStorage.getEmails();
  const select = document.getElementById("application_email");
  select.innerHTML = '<option value="">Select email...</option>';
  emails.forEach((email) => {
    const option = document.createElement("option");
    option.value = email;
    option.textContent = email;
    select.appendChild(option);
  });
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

  document.getElementById("cancel-btn").addEventListener("click", () => {
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
