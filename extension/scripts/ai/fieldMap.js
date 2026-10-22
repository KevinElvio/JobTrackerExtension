// Deterministic field label → intent mapping.
// Used by the autofill engine. NO AI involved here.
// Order matters: more specific patterns first.

const FIELD_INTENTS = [
  // Personal identity
  { intent: "full_name", patterns: [/^full\s*name$/i, /^nama\s*lengkap$/i, /^name$/i, /your\s*name/i] },
  { intent: "first_name", patterns: [/^first\s*name$/i, /nama\s*depan/i, /given\s*name/i, /first\s*given/i] },
  { intent: "last_name", patterns: [/^last\s*name$/i, /nama\s*belakang/i, /family\s*name/i, /surname/i] },
  { intent: "email", patterns: [/e-?mail/i, /surat\s*elektronik/i] },
  { intent: "phone", patterns: [/phone/i, /telp(on)?/i, /no\.?\s*hp/i, /mobile/i, /whatsapp/i, /wa\b/i, /telepon/i] },
  { intent: "city", patterns: [/^city$/i, /kota/i, /domisili/i, /lokasi/i, /location/i] },
  { intent: "address", patterns: [/^address$/i, /alamat/i, /street/i] },
  { intent: "postal_code", patterns: [/postal/i, /zip/i, /kode\s*pos/i] },
  { intent: "linkedin", patterns: [/linkedin/i] },
  { intent: "portfolio", patterns: [/portfolio/i, /portofolio/i] },
  { intent: "github", patterns: [/github/i] },
  { intent: "website", patterns: [/website/i, /personal\s*site/i, /blog/i] },

  // Professional
  { intent: "current_company", patterns: [/current\s*company/i, /perusahaan\s*saat/i, /employer/i] },
  { intent: "current_title", patterns: [/current\s*title/i, /posisi\s*saat/i, /jabatan\s*saat/i, /current\s*role/i] },
  { intent: "years_experience", patterns: [/years?\s*(of\s*)?experience/i, /lama\s*pengalaman/i, /pengalaman\s*(kerja)?/i] },
  { intent: "salary_expectation", patterns: [/expected\s*salary/i, /salary\s*expectation/i, /gaji/i, /besaran\s*gaji/i, /desired\s*salary/i, /expected\s*compensation/i] },
  { intent: "notice_period", patterns: [/notice\s*period/i, /masa\s*pemberitahuan/i, /kapan\s*bisa\s*mulai/i, /availability/i, /kapan\s*mulai/i, /earliest\s*start/i] },
  { intent: "education_level", patterns: [/education\s*level/i, /tingkat\s*pendidikan/i, /pendidikan\s*terakhir/i, /highest\s*education/i, /last\s*education/i] },
  { intent: "major", patterns: [/major/i, /jurusan/i, /field\s*of\s*study/i] },
  { intent: "university", patterns: [/university/i, /universitas/i, /institusi/i, /institution/i, /school/i] },
  { intent: "gpa", patterns: [/gpa/i, /ipk/i, /grade/i] },
  { intent: "skills", patterns: [/skills/i, /keahlian/i, /keterampilan/i] },
  { intent: "languages", patterns: [/language/i, /bahasa/i] },
  { intent: "certifications", patterns: [/certification/i, /sertifikasi/i, /certificate/i] },
  { intent: "work_authorization", patterns: [/authorized\s*to\s*work/i, /work\s*authorization/i, /izin\s*kerja/i, /legal\s*to\s*work/i] },
  { intent: "gender", patterns: [/gender/i, /jenis\s*kelamin/i] },
  { intent: "date_of_birth", patterns: [/date\s*of\s*birth/i, /tanggal\s*lahir/i, /birth\s*date/i, /dob/i] },
  { intent: "nationality", patterns: [/nationality/i, /kewarganegaraan/i, /citizenship/i] },

  // Essay / free-text (handled by LLM, not deterministic)
  { intent: "essay", patterns: [/tell\s*us/i, /describe/i, /ceritakan/i, /jelaskan/i, /why\s*do\s*you/i, /mengapa/i, /motivation/i, /cover\s*letter/i, /about\s*yourself/i, /tentang\s*diri/i] },
];

// Extract a human-readable label from a form field
function extractLabel(el) {
  // 1. aria-label
  if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();

  // 2. <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return label.textContent.trim();
  }

  // 3. closest label
  const closestLabel = el.closest("label");
  if (closestLabel) return closestLabel.textContent.trim();

  // 4. placeholder
  if (el.getAttribute("placeholder")) return el.getAttribute("placeholder").trim();

  // 5. name attribute (cleaned)
  if (el.name) return el.name.replace(/[_-]/g, " ").trim();

  // 6. previous sibling text
  const prev = el.previousElementSibling;
  if (prev && prev.textContent.trim().length < 80) return prev.textContent.trim();

  return "";
}

// Map a label to an intent
function mapIntent(label) {
  const clean = (label || "").trim().toLowerCase();
  if (!clean) return "unknown";

  for (const entry of FIELD_INTENTS) {
    for (const pat of entry.patterns) {
      if (pat.test(clean)) return entry.intent;
    }
  }
  return "unknown";
}

// Check if field is a free-text/essay field
function isEssayField(el, intent) {
  if (intent === "essay") return true;
  if (el.tagName === "TEXTAREA") return true;
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (type === "text" && (el.getAttribute("placeholder") || "").length > 40) return true;
  return false;
}

// Export for use in content script
if (typeof window !== "undefined") {
  window.__fieldMap = { extractLabel, mapIntent, isEssayField, FIELD_INTENTS };
}