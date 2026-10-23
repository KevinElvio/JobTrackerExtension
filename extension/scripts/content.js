chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractJobData") {
    try {
      const data = extractJobData();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  if (request.action === "getPageText") {
    try {
      const text = (document.body && document.body.innerText) ? document.body.innerText : "";
      sendResponse({
        success: true,
        data: {
          text: text.slice(0, 8000),
          url: window.location.href,
          title: document.title || "",
        },
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
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
  } else if (hostname.includes("jobstreet")) {
    data = parseJobStreet(data);
    data.platform = "JobStreet";
  } else if (hostname.includes("indeed.")) {
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

// --- HELPERS ---
function q(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function qAll(selectors) {
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length) return els;
  }
  return [];
}

function stripHtml(html) {
  if (!html) return "";
  let text = html;
  // Replace <br>, <p>, <div>, <li>, <h1-h6> with newlines first
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
  text = text.replace(/<(p|div|li|h[1-6]|tr)[^>]*>/gi, "");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  const el = document.createElement("textarea");
  el.innerHTML = text;
  text = el.value;
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+/g, " ");
  return text.trim();
}

function getText(el) {
  if (!el) return "";
  // Prefer innerHTML strip for elements that may contain nested HTML
  return stripHtml(el.innerHTML || el.textContent).replace(/\s+/g, " ");
}

function cleanSalary(text) {
  if (!text) return "";
  const match = text.match(/[\$\€\£\¥\₹\Rp][\d.,\-\s]+|[\d.,]+\s*(?:per\s*(?:hour|month|year|annum|hr|wk)|\/\s*(?:hr|hour|month|year|annum))/i);
  return match ? match[0].trim() : text;
}

function findNearText(keywords) {
  const allElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6, dt, label, span, div, p, li");
  for (const el of allElements) {
    const text = getText(el).toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        // Look for sibling or next element with value
        const next = el.nextElementSibling;
        if (next) return getText(next);
        const parent = el.parentElement;
        if (parent) {
          const children = Array.from(parent.children);
          const idx = children.indexOf(el);
          if (idx < children.length - 1) return getText(children[idx + 1]);
        }
        // Look for nearby input/select
        const container = el.closest("div, section, dl, ul, ol, fieldset");
        if (container) {
          const val = container.querySelector("span:not(:first-child), dd, .value, [class*='value'], [class*='detail']");
          if (val && val !== el) return getText(val);
        }
      }
    }
  }
  return "";
}

// --- LINKEDIN ---
function parseLinkedIn(data) {
  // Title - multiple fallbacks
  const titleEl = q([
    "h1.top-card-layout__title",
    "h1.t-24.job-details-jobs-unified-top-card__job-title",
    "h1.job-details-jobs-unified-top-card__job-title",
    "h1[class*='job-title']",
    "h1[class*='top-card']",
    "h1",
  ]);
  if (titleEl) data.role = getText(titleEl);

  // Company - multiple fallbacks
  const companyEl = q([
    "a.topcard__org-name-link",
    "a.app-aware-link[href*='/company/']",
    "span.tvm__text",
    "h1 + div a",
    "[class*='job-details'] a[href*='/company/']",
    "[class*='top-card'] a[href*='/company/']",
    "a[class*='org-name']",
    "span[class*='company-name']",
  ]);
  if (companyEl) data.company = getText(companyEl);

  // Try meta/structured data fallback for company
  if (!data.company) {
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        const json = JSON.parse(ld.textContent);
        if (json.hiringOrganization?.name) data.company = json.hiringOrganization.name;
        else if (json.organization?.name) data.company = json.organization.name;
      } catch {}
    }
  }
  if (!data.company) {
    const og = document.querySelector('meta[property="og:title"]');
    if (og) {
      const m = og.content.match(/(?:at|@)\s+(.+?)(?:\s*[-–|]|$)/i);
      if (m) data.company = m[1].trim();
    }
  }

  // Location - multiple fallbacks
  const locationEl = q([
    "span.topcard__flavor--bullet",
    "span.job-details-jobs-unified-top-card__bullet",
    "span[class*='top-card__flavor']",
    "span[class*='job-location']",
    "span[class*='location']",
  ]);
  if (locationEl) data.location = getText(locationEl);

  if (!data.location) {
    data.location = findNearText(["location", "office", "workplace", "city"]);
  }

  // Salary - multiple fallbacks
  const salaryEl = q([
    "div.salary compensation__salary",
    "span.salary",
    "span[class*='salary']",
    "span[class*='compensation']",
    "[class*='salary']",
    "[class*='compensation']",
  ]);
  if (salaryEl) data.salary = cleanSalary(getText(salaryEl));

  if (!data.salary) {
    data.salary = cleanSalary(findNearText(["salary", "compensation", "pay", "wage", "income"]));
  }

  // Description - multiple fallbacks
  const descEl = q([
    "div.description__text",
    "div.job-details__content",
    "div[class*='description']",
    "div[class*='job-details']",
    "div.show-more-less-html__markup",
    "section.description",
  ]);
  if (descEl) data.description = getText(descEl);

  // Employment type
  const empType = findNearText(["employment type", "job type", "contract type", "work type"]);
  if (empType) data.employment_type = normalizeEmploymentType(empType);

  // Try structured data for everything
  if (!data.description || !data.company || !data.salary) {
    const ld = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ld) {
      try {
        const json = JSON.parse(script.textContent);
        if (!data.description && json.description) data.description = stripHtml(json.description);
        if (!data.company && json.hiringOrganization?.name) data.company = json.hiringOrganization.name;
        if (!data.salary && json.estimatedSalary) {
          data.salary = `${json.estimatedSalary.minValue || ""} - ${json.estimatedSalary.maxValue || ""} ${json.estimatedSalary.currency || ""}`;
        }
        if (!data.employment_type && json.employmentType) {
          data.employment_type = normalizeEmploymentType(json.employmentType);
        }
        if (!data.location && json.jobLocation?.address) {
          const addr = json.jobLocation.address;
          data.location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
        }
      } catch {}
    }
  }

  return data;
}

// --- JOBSTREET ---
function parseJobStreet(data) {
  const titleEl = q([
    "h1.job-title",
    "h1[data-automation='job-title']",
    "h1[class*='job-title']",
    "h1[class*='JobTitle']",
    "h1",
  ]);
  if (titleEl) data.role = getText(titleEl);

  const companyEl = q([
    "a.company-name",
    "a[data-automation='company-name']",
    "a[class*='company-name']",
    "a[class*='CompanyName']",
    "[data-automation='company-name']",
    "a[href*='/company/']",
  ]);
  if (companyEl) data.company = getText(companyEl);

  const locationEl = q([
    "span.job-location",
    "span[data-automation='job-location']",
    "span[class*='job-location']",
    "span[class*='JobLocation']",
    "[data-automation='job-location']",
    "span[class*='location']",
  ]);
  if (locationEl) data.location = getText(locationEl);

  const salaryEl = q([
    "span.job-salary",
    "span[data-automation='job-salary']",
    "span[class*='job-salary']",
    "span[class*='JobSalary']",
    "[data-automation='job-salary']",
    "span[class*='salary']",
  ]);
  if (salaryEl) data.salary = cleanSalary(getText(salaryEl));

  const descEl = q([
    "div.job-description",
    "div[data-automation='job-description']",
    "div[class*='job-description']",
    "div[class*='JobDescription']",
    "[data-automation='job-description']",
    "div[class*='description']",
  ]);
  if (descEl) data.description = getText(descEl);

  // Meta/structured data fallback
  if (!data.company || !data.description) {
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        const json = JSON.parse(ld.textContent);
        if (!data.company && json.hiringOrganization?.name) data.company = json.hiringOrganization.name;
        if (!data.description && json.description) data.description = stripHtml(json.description);
        if (!data.location && json.jobLocation?.address) {
          const addr = json.jobLocation.address;
          data.location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
        }
      } catch {}
    }
  }

  const empType = findNearText(["employment type", "jenis pekerjaan", "tipe pekerjaan"]);
  if (empType) data.employment_type = normalizeEmploymentType(empType);

  return data;
}

// --- INDEED ---
function parseIndeed(data) {
  const titleEl = q([
    "h1.jobsearch-JobInfoHeader-title",
    "h1.jobsearch-JobInfoHeader-title-container",
    "h1[data-testid='jobsearch-JobInfoHeader-title']",
    "h1[class*='JobInfoHeader']",
    "h1[class*='jobTitle']",
    "h1",
  ]);
  if (titleEl) data.role = getText(titleEl);

  const companyEl = q([
    "div.jobsearch-CompanyInfoButton a",
    "a[data-testid='company-name']",
    "a[class*='company-name']",
    "a[class*='CompanyInfo']",
    "a[href*='/cmp/']",
    "span[data-testid='company-name']",
  ]);
  if (companyEl) data.company = getText(companyEl);

  if (!data.company) {
    const cmp = document.querySelector("[data-testid='inlineHeader-companyName']");
    if (cmp) data.company = getText(cmp);
  }

  const locationEl = q([
    "div.jobsearch-JobInfoHeader-subtitle div",
    "div[data-testid='inlineHeader-companyLocation']",
    "div[class*='companyLocation']",
    "div[class*='JobInfoHeader'] div",
    "div[data-testid='text-location']",
  ]);
  if (locationEl) data.location = getText(locationEl);

  const salaryEl = q([
    "div.jobsearch-JobMetadataHeader-item span",
    "div[data-testid='attribute_snippet_compensation']",
    "span[class*='salary']",
    "div[class*='salary-snippet']",
    "div[data-testid*='salary']",
  ]);
  if (salaryEl) data.salary = cleanSalary(getText(salaryEl));

  const descEl = q([
    "div.jobsearch-jobDescriptionText",
    "div[data-testid='jobDescriptionText']",
    "div[class*='jobDescriptionText']",
    "div[class*='JobDescription']",
    "div#jobDescriptionText",
  ]);
  if (descEl) data.description = getText(descEl);

  // Structured data fallback
  if (!data.company || !data.description) {
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        const json = JSON.parse(ld.textContent);
        if (!data.company && json.hiringOrganization?.name) data.company = json.hiringOrganization.name;
        if (!data.description && json.description) data.description = stripHtml(json.description);
        if (!data.salary && json.estimatedSalary) {
          data.salary = `${json.estimatedSalary.minValue || ""} - ${json.estimatedSalary.maxValue || ""} ${json.estimatedSalary.currency || ""}`;
        }
      } catch {}
    }
  }

  const empType = findNearText(["employment type", "job type"]);
  if (empType) data.employment_type = normalizeEmploymentType(empType);

  return data;
}

// --- GENERIC ---
function parseGeneric(data) {
  // Try structured data first (most reliable)
  const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of ldScripts) {
    try {
      const json = JSON.parse(script.textContent);
      if (json["@type"] === "JobPosting" || json["@type"] === "Job") {
        if (json.title) data.role = json.title;
        if (json.hiringOrganization?.name) data.company = json.hiringOrganization.name;
        if (json.description) data.description = json.description;
        if (json.employmentType) data.employment_type = normalizeEmploymentType(json.employmentType);
        if (json.estimatedSalary) {
          data.salary = `${json.estimatedSalary.minValue || ""} - ${json.estimatedSalary.maxValue || ""} ${json.estimatedSalary.currency || ""}`;
        }
        if (json.jobLocation?.address) {
          const addr = json.jobLocation.address;
          data.location = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
        }
        if (json.baseSalary) {
          data.salary = `${json.baseSalary.value?.minValue || ""} - ${json.baseSalary.value?.maxValue || ""} ${json.baseSalary.value?.currency || ""}`;
        }
        break;
      }
    } catch {}
  }

  // Meta tags fallback
  if (!data.role) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) data.role = ogTitle.content.split(" - ")[0].trim();
  }

  if (!data.company) {
    const metaCompany = document.querySelector('meta[name="company"], meta[property="og:site_name"]');
    if (metaCompany) data.company = metaCompany.getAttribute("content") || "";
  }

  if (!data.description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) data.description = metaDesc.getAttribute("content") || "";
  }

  // DOM-based fallback
  if (!data.role) {
    const h1 = document.querySelector("h1");
    if (h1) data.role = getText(h1);
  }

  if (!data.company) {
    data.company = findNearText(["company", "organization", "employer", "perusahaan"]);
  }

  if (!data.location) {
    data.location = findNearText(["location", "address", "city", "office", "workplace", "lokasi"]);
  }

  if (!data.salary) {
    data.salary = cleanSalary(findNearText(["salary", "compensation", "pay", "wage", "gaji"]));
  }

  if (!data.description) {
    const main = document.querySelector("main, article, [role='main'], .content, #content");
    if (main) data.description = getText(main).substring(0, 5000);
  }

  // Employment type from text
  if (!data.employment_type) {
    const empType = findNearText(["employment type", "job type", "contract type", "tipe pekerjaan"]);
    if (empType) data.employment_type = normalizeEmploymentType(empType);
  }

  return data;
}

// --- UTILS ---
function detectPlatform(hostname) {
  if (hostname.includes("linkedin.com")) return "LinkedIn";
  if (hostname.includes("jobstreet")) return "JobStreet";
  if (hostname.includes("indeed.")) return "Indeed";
  if (hostname.includes("glints.")) return "Glints";
  if (hostname.includes("kalibrr.")) return "Kalibrr";
  if (hostname.includes("deels.")) return "Deels";
  if (hostname.includes("glassdoor.")) return "Glassdoor";
  if (hostname.includes("monster.")) return "Monster";
  if (hostname.includes("dice.")) return "Dice";
  if (hostname.includes("remoteok.")) return "RemoteOK";
  if (hostname.includes("weworkremotely.")) return "WeWorkRemotely";
  return "Company Website";
}

function normalizeEmploymentType(type) {
  if (!type) return "";
  const lower = type.toLowerCase();
  if (lower.includes("intern")) return "Internship";
  if (lower.includes("full")) return "Full Time";
  if (lower.includes("part")) return "Part Time";
  if (lower.includes("contract")) return "Contract";
  if (lower.includes("freelanc")) return "Freelance";
  if (lower.includes("temporary") || lower.includes("temp")) return "Contract";
  return type;
}
