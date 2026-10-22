// Content script: scans forms and executes fill instructions.
// Communicates with background worker via chrome.runtime messages.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanForm") {
    try {
      const fields = scanFormFields();
      sendResponse({ success: true, fields });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  if (request.action === "fillFields") {
    try {
      const results = executeFills(request.fills || []);
      sendResponse({ success: true, results });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  return false;
});

// --- Scan all form fields on the page ---
function scanFormFields() {
  const selectors = "input, select, textarea";
  const els = Array.from(document.querySelectorAll(selectors));
  const fields = [];

  els.forEach((el, idx) => {
    // Skip hidden/disabled/readonly (except url which we set)
    const type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
    if (type === "hidden" || type === "submit" || type === "button" || type === "reset") return;
    if (el.disabled) return;

    const label = extractLabel(el);
    const intent = mapIntent(label);

    // Generate a unique selector
    const selector = generateSelector(el, idx);

    fields.push({
      index: idx,
      selector,
      label,
      intent,
      type: el.tagName.toLowerCase() === "select" ? "select" : type,
      isEssay: isEssayField(el, intent),
      value: el.value || "",
    });
  });

  return fields;
}

function extractLabel(el) {
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return label.textContent.trim();
  }
  const closestLabel = el.closest("label");
  if (closestLabel) return closestLabel.textContent.trim();
  if (el.getAttribute("placeholder")) return el.getAttribute("placeholder").trim();
  if (el.name) return el.name.replace(/[_-]/g, " ").trim();
  const prev = el.previousElementSibling;
  if (prev && prev.textContent.trim().length < 80) return prev.textContent.trim();
  return "";
}

function mapIntent(label) {
  const clean = (label || "").trim().toLowerCase();
  if (!clean) return "unknown";

  const patterns = [
    { intent: "full_name", p: [/^full\s*name$/i, /^nama\s*lengkap$/i, /^name$/i, /your\s*name/i] },
    { intent: "first_name", p: [/^first\s*name$/i, /nama\s*depan/i, /given\s*name/i] },
    { intent: "last_name", p: [/^last\s*name$/i, /nama\s*belakang/i, /family\s*name/i, /surname/i] },
    { intent: "email", p: [/e-?mail/i, /surat\s*elektronik/i] },
    { intent: "phone", p: [/phone/i, /telp(on)?/i, /no\.?\s*hp/i, /mobile/i, /whatsapp/i, /wa\b/i, /telepon/i] },
    { intent: "city", p: [/^city$/i, /kota/i, /domisili/i, /lokasi/i, /location/i] },
    { intent: "address", p: [/^address$/i, /alamat/i, /street/i] },
    { intent: "postal_code", p: [/postal/i, /zip/i, /kode\s*pos/i] },
    { intent: "linkedin", p: [/linkedin/i] },
    { intent: "portfolio", p: [/portfolio/i, /portofolio/i] },
    { intent: "github", p: [/github/i] },
    { intent: "website", p: [/website/i, /personal\s*site/i, /blog/i] },
    { intent: "current_company", p: [/current\s*company/i, /perusahaan\s*saat/i, /employer/i] },
  { intent: "current_title", p: [/current\s*title/i, /posisi\s*saat/i, /jabatan\s*saat/i, /current\s*role/i] },
  { intent: "salary_expectation", p: [/expected\s*salary/i, /salary\s*expectation/i, /gaji/i, /besaran\s*gaji/i, /desired\s*salary/i] },
    { intent: "notice_period", p: [/notice\s*period/i, /masa\s*pemberitahuan/i, /kapan\s*bisa\s*mulai/i, /availability/i, /kapan\s*mulai/i, /earliest\s*start/i] },
    { intent: "education_level", p: [/education\s*level/i, /tingkat\s*pendidikan/i, /pendidikan\s*terakhir/i, /highest\s*education/i] },
    { intent: "major", p: [/major/i, /jurusan/i, /field\s*of\s*study/i] },
    { intent: "university", p: [/university/i, /universitas/i, /institusi/i, /institution/i, /school/i] },
    { intent: "gpa", p: [/gpa/i, /ipk/i, /grade/i] },
    { intent: "skills", p: [/skills/i, /keahlian/i, /keterampilan/i] },
    { intent: "languages", p: [/language/i, /bahasa/i] },
    { intent: "certifications", p: [/certification/i, /sertifikasi/i, /certificate/i] },
    { intent: "work_authorization", p: [/authorized\s*to\s*work/i, /work\s*authorization/i, /izin\s*kerja/i] },
    { intent: "gender", p: [/gender/i, /jenis\s*kelamin/i] },
    { intent: "date_of_birth", p: [/date\s*of\s*birth/i, /tanggal\s*lahir/i, /birth\s*date/i, /dob/i] },
    { intent: "nationality", p: [/nationality/i, /kewarganegaraan/i, /citizenship/i] },
    { intent: "essay", p: [/tell\s*us/i, /describe/i, /ceritakan/i, /jelaskan/i, /why\s*do\s*you/i, /mengapa/i, /motivation/i, /cover\s*letter/i, /about\s*yourself/i, /tentang\s*diri/i] },
  ];

  for (const entry of patterns) {
    for (const pat of entry.p) {
      if (pat.test(clean)) return entry.intent;
    }
  }
  return "unknown";
}

function isEssayField(el, intent) {
  if (intent === "essay") return true;
  if (el.tagName === "TEXTAREA") return true;
  return false;
}

function generateSelector(el, idx) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) return `[name="${CSS.escape(el.name)}"]`;
  // Robust fallback: stamp a unique attribute so the element can be
  // re-located deterministically even without id/name.
  const attr = "data-jt-field";
  el.setAttribute(attr, String(idx));
  return `[${attr}="${idx}"]`;
}

// --- Execute fill instructions ---
function executeFills(fills) {
  const results = [];
  for (const fill of fills) {
    try {
      const el = document.querySelector(fill.selector);
      if (!el) {
        results.push({ selector: fill.selector, success: false, error: "element not found" });
        continue;
      }
      nativeFill(el, fill.value, fill.type);
      results.push({ selector: fill.selector, success: true });
    } catch (err) {
      results.push({ selector: fill.selector, success: false, error: err.message });
    }
  }
  return results;
}

function nativeFill(el, value, type) {
  if (el.tagName === "SELECT") {
    selectFill(el, value);
  } else if (el.getAttribute("type") === "file") {
    // File inputs handled separately
    return;
  } else {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function selectFill(el, value) {
  const exists = Array.from(el.options).some((o) => o.value === value);
  if (!exists) {
    el.add(new Option(value, value));
  }
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc && desc.set) {
    desc.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("change", { bubbles: true }));
}