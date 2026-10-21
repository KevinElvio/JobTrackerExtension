const DEFAULT_API_URL = "http://localhost:8000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["applicationEmails"], (result) => {
    if (!result.applicationEmails) {
      chrome.storage.local.set({ applicationEmails: [] });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getEmails") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      sendResponse({ emails: result.applicationEmails || [] });
    });
    return true;
  }

  if (request.action === "addEmail") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      const emails = result.applicationEmails || [];
      if (!emails.includes(request.email)) {
        emails.push(request.email);
        chrome.storage.local.set({ applicationEmails: emails });
      }
      sendResponse({ emails });
    });
    return true;
  }

  if (request.action === "removeEmail") {
    chrome.storage.local.get(["applicationEmails"], (result) => {
      const emails = (result.applicationEmails || []).filter(
        (e) => e !== request.email
      );
      chrome.storage.local.set({ applicationEmails: emails });
      sendResponse({ emails });
    });
    return true;
  }

  // --- AI Autofill orchestration ---
  if (request.action === "autofill") {
    handleAutofill(request.tabId, request.apiUrl)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});

async function getApiBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["api_url"], (result) => {
      resolve(result.api_url || DEFAULT_API_URL);
    });
  });
}

async function handleAutofill(tabId, apiUrl) {
  const apiBase = apiUrl || (await getApiBaseUrl());

  // 1. Fetch profile
  const profileRes = await fetch(`${apiBase}/api/profile`);
  if (!profileRes.ok) throw new Error("Failed to fetch profile.");
  const profileData = await profileRes.json();
  if (!profileData.success) throw new Error(profileData.message || "Profile not found.");
  const profile = profileData.data;

  // 2. Fetch context.md
  const ctxRes = await fetch(`${apiBase}/api/profile/context`);
  const ctxData = await ctxRes.json();
  const personalContext = ctxData.success ? ctxData.data.content : "";

  // 3. Extract job data from page
  const jobRes = await chrome.tabs.sendMessage(tabId, { action: "extractJobData" });
  const jobData = jobRes?.success ? jobRes.data : {};

  // 4. Scan form fields
  const scanRes = await chrome.tabs.sendMessage(tabId, { action: "scanForm" });
  if (!scanRes?.success) throw new Error(scanRes?.error || "Failed to scan form.");
  const fields = scanRes.fields || [];

  // 5. Build fill plan
  const df = profile.direct_fill || {};
  const supporting = profile.supporting || {};
  const fills = [];

  for (const field of fields) {
    const intent = field.intent;
    let value = null;
    let isEssay = field.isEssay;

    // Deterministic fills
    switch (intent) {
      case "full_name":
        value = df.full_name;
        break;
      case "first_name":
        value = (df.full_name || "").split(" ")[0];
        break;
      case "last_name":
        value = (df.full_name || "").split(" ").slice(1).join(" ");
        break;
      case "email":
        value = df.email;
        break;
      case "phone":
        value = df.phone;
        break;
      case "city":
        value = df.city;
        break;
      case "address":
        value = df.city; // fallback to city
        break;
      case "linkedin":
        value = df.linkedin;
        break;
      case "salary_expectation":
        value = df.salary_expectation;
        break;
      case "notice_period":
        value = df.notice_period;
        break;
      case "skills":
        value = (df.skills || []).join(", ");
        break;
      case "languages":
        value = (df.languages || []).join(", ");
        break;
      case "essay":
        isEssay = true;
        break;
      default:
        value = null;
    }

    // For essay fields, call LLM
    if (isEssay && field.label) {
      try {
        const llmRes = await fetch(`${apiBase}/api/ai/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: field.label,
            job_context: jobData,
            personal_context: personalContext,
          }),
        });
        const llmData = await llmRes.json();
        if (llmData.success) value = llmData.data.answer;
      } catch (e) {
        console.error("LLM fill failed:", e.message);
      }
    }

    if (value) {
      fills.push({ selector: field.selector, value, type: field.type });
    }
  }

  // 6. Execute fills
  const execRes = await chrome.tabs.sendMessage(tabId, {
    action: "fillFields",
    fills,
  });

  return {
    success: true,
    filled: fills.length,
    results: execRes?.results || [],
  };
}