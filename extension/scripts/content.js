chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractJobData") {
    try {
      const data = extractJobData();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});

function extractJobData() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  const title = document.title;

  let data = {
    role: "",
    company: "",
    location: "",
    salary: "",
    description: "",
    url: url,
    platform: "",
    employment_type: "",
  };

  if (hostname.includes("linkedin.com")) {
    data = parseLinkedIn(data);
    data.platform = "LinkedIn";
  } else if (hostname.includes("jobstreet.co.id")) {
    data = parseJobStreet(data);
    data.platform = "JobStreet";
  } else if (hostname.includes("indeed.com")) {
    data = parseIndeed(data);
    data.platform = "Indeed";
  } else {
    data = parseGeneric(data);
    data.platform = detectPlatform(hostname);
  }

  if (!data.role && title) {
    data.role = title.split(" - ")[0].trim();
  }

  return data;
}

function parseLinkedIn(data) {
  const jobTitleEl = document.querySelector("h1.top-card-layout__title");
  if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

  const companyEl = document.querySelector("a.topcard__org-name-link");
  if (companyEl) data.company = companyEl.textContent.trim();

  const locationEl = document.querySelector("span.topcard__flavor--bullet");
  if (locationEl) data.location = locationEl.textContent.trim();

  const salaryEl = document.querySelector("div.salary compensation__salary");
  if (salaryEl) data.salary = salaryEl.textContent.trim();

  const descEl = document.querySelector("div.description__text");
  if (descEl) data.description = descEl.textContent.trim();

  const typeEl = document.querySelector("span.job-criteria__subheader");
  if (typeEl && typeEl.textContent.includes("Employment type")) {
    const valueEl = typeEl.parentElement?.querySelector("li span");
    if (valueEl) data.employment_type = normalizeEmploymentType(valueEl.textContent.trim());
  }

  return data;
}

function parseJobStreet(data) {
  const jobTitleEl = document.querySelector("h1.job-title");
  if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

  const companyEl = document.querySelector("a.company-name");
  if (companyEl) data.company = companyEl.textContent.trim();

  const locationEl = document.querySelector("span.job-location");
  if (locationEl) data.location = locationEl.textContent.trim();

  const salaryEl = document.querySelector("span.job-salary");
  if (salaryEl) data.salary = salaryEl.textContent.trim();

  const descEl = document.querySelector("div.job-description");
  if (descEl) data.description = descEl.textContent.trim();

  return data;
}

function parseIndeed(data) {
  const jobTitleEl = document.querySelector("h1.jobsearch-JobInfoHeader-title");
  if (jobTitleEl) data.role = jobTitleEl.textContent.trim();

  const companyEl = document.querySelector("div.jobsearch-CompanyInfoButton a");
  if (companyEl) data.company = companyEl.textContent.trim();

  const locationEl = document.querySelector("div.jobsearch-JobInfoHeader-subtitle div");
  if (locationEl) data.location = locationEl.textContent.trim();

  const salaryEl = document.querySelector("div.jobsearch-JobMetadataHeader-item span");
  if (salaryEl) data.salary = salaryEl.textContent.trim();

  const descEl = document.querySelector("div.jobsearch-jobDescriptionText");
  if (descEl) data.description = descEl.textContent.trim();

  return data;
}

function parseGeneric(data) {
  const h1 = document.querySelector("h1");
  if (h1) data.role = h1.textContent.trim();

  const metaCompany = document.querySelector('meta[name="company"]');
  if (metaCompany) {
    data.company = metaCompany.getAttribute("content") || "";
  }

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    data.description = metaDescription.getAttribute("content") || "";
  }

  return data;
}

function detectPlatform(hostname) {
  if (hostname.includes("linkedin.com")) return "LinkedIn";
  if (hostname.includes("jobstreet")) return "JobStreet";
  if (hostname.includes("indeed.")) return "Indeed";
  if (hostname.includes("glints.")) return "Glints";
  if (hostname.includes("kalibrr.")) return "Kalibrr";
  return "Company Website";
}

function normalizeEmploymentType(type) {
  const lower = type.toLowerCase();
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("full")) return "Full Time";
  if (lower.includes("part")) return "Part Time";
  if (lower.includes("contract")) return "Contract";
  if (lower.includes("freelanc")) return "Freelance";
  return type;
}
