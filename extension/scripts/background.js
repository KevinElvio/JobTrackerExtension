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

  // 3. Extract job data from the main frame (best-effort)
  let jobData = {};
  try {
    const jobRes = await chrome.tabs.sendMessage(tabId, { action: "extractJobData" }, { frameId: 0 });
    if (jobRes?.success) jobData = jobRes.data || {};
  } catch (e) {
    console.warn("extractJobData failed:", e.message);
  }

  // 4. Enumerate frames so forms rendered in iframes are also handled
  let frames = [{ frameId: 0 }];
  try {
    const navFrames = await chrome.webNavigation.getAllFrames({ tabId });
    if (Array.isArray(navFrames) && navFrames.length) frames = navFrames;
  } catch (e) {
    console.warn("getAllFrames failed:", e.message);
  }

  // 5. Scan form fields in every frame
  const frameScans = [];
  for (const frame of frames) {
    try {
      const scanRes = await chrome.tabs.sendMessage(
        tabId,
        { action: "scanForm" },
        { frameId: frame.frameId }
      );
      if (scanRes?.success && Array.isArray(scanRes.fields) && scanRes.fields.length) {
        frameScans.push({ frameId: frame.frameId, fields: scanRes.fields });
      }
    } catch (e) {
      // Frame may not have the content script injected (e.g. chrome:// pages)
    }
  }
  if (frameScans.length === 0) {
    throw new Error("No form fields found on this page (or content script not injected). Refresh the page and try again.");
  }

  // 6. Build fill plan (deterministic + LLM essay) per frame
  const df = profile.direct_fill || {};
  const supporting = profile.supporting || {};
  const education = Array.isArray(supporting.education) ? supporting.education[0] || {} : {};
  const experience = Array.isArray(supporting.experiences) ? supporting.experiences[0] || {} : {};

  // Helper to resolve a value for a given intent, including supporting-profile data
  function resolveValue(intent, field) {
    let value = null;
    let isEssay = field.isEssay;

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
      case "address":
        value = df.city;
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
      case "education_level":
        value = education.degree || "";
        break;
      case "major":
        value = education.major || "";
        break;
      case "university":
        value = education.institution || "";
        break;
      case "gpa":
        value = education.gpa || "";
        break;
      case "current_company":
        value = experience.company || "";
        break;
      case "current_title":
        value = experience.title || "";
        break;
      case "essay":
        isEssay = true;
        break;
      default:
        value = null;
    }
    return { value, isEssay };
  }

  const fillsByFrame = new Map();
  for (const { frameId, fields } of frameScans) {
    const fills = [];
    for (const field of fields) {
      const { value: initialValue, isEssay } = resolveValue(field.intent, field);
      let value = initialValue;

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
    if (fills.length) fillsByFrame.set(frameId, fills);
  }

  if (fillsByFrame.size === 0) {
    throw new Error("Profile data is empty or no recognized fields were found. Save your profile first.");
  }

  // 7. Execute fills per frame
  let totalFilled = 0;
  const allResults = [];
  for (const [frameId, fills] of fillsByFrame) {
    try {
      const execRes = await chrome.tabs.sendMessage(
        tabId,
        { action: "fillFields", fills },
        { frameId }
      );
      totalFilled += fills.length;
      if (Array.isArray(execRes?.results)) allResults.push(...execRes.results);
    } catch (e) {
      console.error("fillFields failed for frame", frameId, e.message);
    }
  }

  return {
    success: true,
    filled: totalFilled,
    results: allResults,
  };
}