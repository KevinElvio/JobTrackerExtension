const fs = require("fs");
const XLSX = require("xlsx");
const csvService = require("../services/csvService");
const { sanitizeApplication } = require("../services/sanitizeService");
const { generateId } = require("../utils/helpers");

const VALID_STATUSES = ["Applied", "Interview", "Rejected", "Offer", "Accepted", "Withdrawn"];
const VALID_EMPLOYMENT_TYPES = ["Internship", "Full Time", "Part Time", "Contract", "Freelance"];

function formatSalaryRange(value) {
  const text = String(value || "").trim();
  if (!/\bIDR\b|\bRp\.?/i.test(text)) return text;
  const amounts = text.match(/\d[\d.,]*/g);
  if (!amounts?.length) return text;
  const formatted = amounts.slice(0, 2).map((amount) => {
    const digits = amount.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
  return `IDR ${formatted.join(" - ")}`;
}

function validateApplication(data, requireFields = false) {
  if (requireFields && (!data.job_role?.trim() || !data.company_name?.trim())) {
    return "job_role and company_name are required.";
  }
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    return "Invalid status.";
  }
  if (data.employment_type !== undefined && !VALID_EMPLOYMENT_TYPES.includes(data.employment_type)) {
    return "Invalid employment_type.";
  }
  if (data.date_applied !== undefined) {
    const date = new Date(`${data.date_applied}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date_applied) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== data.date_applied) {
      return "Invalid date_applied. Use YYYY-MM-DD.";
    }
  }
  if (data.job_url) {
    try {
      new URL(data.job_url);
    } catch {
      return "Invalid job_url.";
    }
  }
  return null;
}

function checkDuplicate(url) {
  const records = csvService.getAll();
  return records.find((r) => r.job_url === url) || null;
}

exports.create = (req, res) => {
  try {
    const data = req.body || {};

    const validationError = validateApplication(data, true);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const sanitized = sanitizeApplication({ ...data });

    if (!data.force_save) {
      const duplicate = checkDuplicate(sanitized.job_url);
      if (duplicate) {
        return res.status(200).json({
          success: false,
          code: "DUPLICATE_WARNING",
          data: { application_id: duplicate.application_id, job_url: duplicate.job_url },
          message: "A job with this URL already exists.",
        });
      }
    }

    const record = {
      application_id: generateId(),
      job_role: sanitized.job_role || "",
      company_name: sanitized.company_name || "",
      location: sanitized.location || "",
      date_applied: sanitized.date_applied || new Date().toISOString().slice(0, 10),
      application_email: sanitized.application_email || "",
      application_platform: sanitized.application_platform || "",
      employment_type: VALID_EMPLOYMENT_TYPES.includes(data.employment_type) ? data.employment_type : "Full Time",
      salary_range: formatSalaryRange(sanitized.salary_range),
      job_description: sanitized.job_description || "",
      job_url: sanitized.job_url || "",
      status: VALID_STATUSES.includes(data.status) ? data.status : "Applied",
      notes: sanitized.notes || "",
    };

    csvService.insert(record);

    return res.status(201).json({
      success: true,
      data: { application_id: record.application_id },
      message: "Application saved successfully.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.list = (req, res) => {
  const records = csvService.getAll();
  return res.json({ success: true, data: records, total: records.length });
};

exports.getById = (req, res) => {
  const record = csvService.getById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Application not found." });
  }
  return res.json({ success: true, data: record });
};

exports.update = (req, res) => {
  const existing = csvService.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Application not found." });
  }

  const body = req.body || {};
  const data = {};
  Object.keys(body).forEach((key) => {
    if (body[key] !== undefined) data[key] = body[key];
  });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No data to update." });
    }

    const validationError = validateApplication({ ...existing, ...data }, true);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const sanitized = sanitizeApplication(data);
    if (sanitized.salary_range !== undefined) {
      sanitized.salary_range = formatSalaryRange(sanitized.salary_range);
    }
    const ok = csvService.update(req.params.id, sanitized);

  if (!ok) {
    return res.status(500).json({ success: false, message: "Failed to update." });
  }

  const updated = csvService.getById(req.params.id);
  return res.json({ success: true, data: updated, message: "Application updated." });
};

exports.remove = (req, res) => {
  const existing = csvService.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Application not found." });
  }

  const ok = csvService.remove(req.params.id);
  if (!ok) {
    return res.status(500).json({ success: false, message: "Failed to delete." });
  }

  return res.json({ success: true, message: "Application deleted." });
};

const IMPORT_FIELDS = [
  "job_role", "company_name", "location", "date_applied",
  "application_email", "application_platform", "employment_type",
  "salary_range", "status", "job_url", "job_description", "notes",
];

const FIELD_ALIASES = {
  "job role": "job_role", "role": "job_role", "position": "job_role", "title": "job_role",
  "company": "company_name", "company name": "company_name", "employer": "company_name",
  "location": "location", "city": "location", "address": "location",
  "date applied": "date_applied", "date": "date_applied", "applied date": "date_applied", "applied": "date_applied",
  "email": "application_email", "application email": "application_email",
  "platform": "application_platform", "application platform": "application_platform", "source": "application_platform",
  "employment type": "employment_type", "type": "employment_type", "job type": "employment_type",
  "salary": "salary_range", "salary range": "salary_range", "compensation": "salary_range",
  "status": "status", "application status": "status",
  "url": "job_url", "job url": "job_url", "link": "job_url", "job link": "job_url",
  "description": "job_description", "job description": "job_description", "desc": "job_description",
  "notes": "notes", "note": "notes", "remark": "notes", "remarks": "notes",
};

function parseUploadedFile(filePath, originalName) {
  const ext = (originalName || "").split(".").pop().toLowerCase();
  let rows = [];

  if (ext === "csv" || ["xlsx", "xls"].includes(ext)) {
    const workbook = XLSX.readFile(filePath, { type: "file", cellDates: false, raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
      headers.push(cell ? String(cell.v).trim() : "");
    }

    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const row = {};
      let hasData = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: r, c })];
        const header = headers[c - range.s.c];
        if (!header) continue;

        let value = "";
        if (cell) {
          hasData = true;
          if (cell.t === "n" && cell.w && /^\d{4}-\d{2}-\d{2}$/.test(cell.w)) {
            value = cell.w;
          } else if (cell.t === "d" && cell.v instanceof Date) {
            value = cell.v.toISOString().slice(0, 10);
          } else if (cell.t === "n" && cell.w) {
            value = cell.w;
          } else {
            value = String(cell.v ?? "");
          }
        }
        row[header] = value;
      }
      if (hasData) rows.push(row);
    }
  }

  return rows.length > 0 ? rows : null;
}

function mapColumns(rows) {
  return rows.map((row) => {
    const mapped = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim().toLowerCase();
      const field = FIELD_ALIASES[cleanKey] || cleanKey;
      if (IMPORT_FIELDS.includes(field)) {
        mapped[field] = String(row[key] ?? "").trim();
      }
    });
    return mapped;
  });
}

function validateRow(data) {
  const errors = [];

  if (!data.job_role) errors.push("job_role is required");
  if (!data.company_name) errors.push("company_name is required");

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status: "${data.status}". Use: ${VALID_STATUSES.join(", ")}`);
  }
  if (data.employment_type && !VALID_EMPLOYMENT_TYPES.includes(data.employment_type)) {
    errors.push(`Invalid employment_type: "${data.employment_type}". Use: ${VALID_EMPLOYMENT_TYPES.join(", ")}`);
  }
  if (data.date_applied) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date_applied)) {
      errors.push(`Invalid date_applied: "${data.date_applied}". Use YYYY-MM-DD.`);
    } else {
      const d = new Date(`${data.date_applied}T00:00:00.000Z`);
      if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== data.date_applied) {
        errors.push(`Invalid date_applied: "${data.date_applied}".`);
      }
    }
  }
  if (data.job_url) {
    try { new URL(data.job_url); } catch {
      errors.push(`Invalid job_url: "${data.job_url}".`);
    }
  }

  return errors;
}

exports.preview = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const filePath = req.file.path;

    try {
      const rows = parseUploadedFile(filePath, req.file.originalname);
      if (!rows || rows.length === 0) {
        return res.status(400).json({ success: false, message: "File is empty or has no data rows." });
      }

      const mapped = mapColumns(rows);
      const allRecords = csvService.getAll();

      const preview = mapped.map((row, index) => {
      const errors = validateRow(row);
      const duplicate = row.job_url ? allRecords.find((r) => r.job_url === row.job_url) : null;

      return {
        index: index + 1,
        data: row,
        errors,
        isValid: errors.length === 0,
        isDuplicate: !!duplicate,
        duplicateId: duplicate ? duplicate.application_id : null,
      };
    });

    const validCount = preview.filter((r) => r.isValid && !r.isDuplicate).length;
    const errorCount = preview.filter((r) => !r.isValid).length;
    const duplicateCount = preview.filter((r) => r.isDuplicate).length;

    return res.json({
      success: true,
      data: {
        rows: preview,
        summary: { total: preview.length, valid: validCount, errors: errorCount, duplicates: duplicateCount },
        fileName: req.file.originalname,
      },
    });
    } finally {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to parse file: " + err.message });
  }
};

exports.import = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const filePath = req.file.path;

    try {
      const duplicatePolicy = req.body.duplicatePolicy || "skip";
      const validPolicies = ["skip", "overwrite", "duplicate"];
      if (!validPolicies.includes(duplicatePolicy)) {
        return res.status(400).json({ success: false, message: "Invalid duplicatePolicy. Use: skip, overwrite, duplicate." });
      }

      const rows = parseUploadedFile(filePath, req.file.originalname);
      if (!rows || rows.length === 0) {
        return res.status(400).json({ success: false, message: "File is empty or has no data rows." });
      }

    const mapped = mapColumns(rows);
    const allRecords = csvService.getAll();

    const toInsert = [];
    const toUpdate = [];
    const skipped = [];
    const errors = [];

    mapped.forEach((row, index) => {
      const rowNum = index + 1;
      const rowErrors = validateRow(row);

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors, data: row });
        return;
      }

      const duplicate = row.job_url ? allRecords.find((r) => r.job_url === row.job_url) : null;

      if (duplicate) {
        if (duplicatePolicy === "skip") {
          skipped.push({ row: rowNum, reason: "duplicate", data: row });
        } else if (duplicatePolicy === "overwrite") {
          toUpdate.push({ id: duplicate.application_id, data: sanitizeApplication({ ...row }) });
        } else {
          toInsert.push({
            application_id: generateId(),
            job_role: row.job_role || "",
            company_name: row.company_name || "",
            location: row.location || "",
            date_applied: row.date_applied || new Date().toISOString().slice(0, 10),
            application_email: row.application_email || "",
            application_platform: row.application_platform || "",
            employment_type: VALID_EMPLOYMENT_TYPES.includes(row.employment_type) ? row.employment_type : "Full Time",
            salary_range: row.salary_range || "",
            job_description: row.job_description || "",
            job_url: row.job_url || "",
            status: VALID_STATUSES.includes(row.status) ? row.status : "Applied",
            notes: row.notes || "",
          });
        }
      } else {
        toInsert.push({
          application_id: generateId(),
          job_role: row.job_role || "",
          company_name: row.company_name || "",
          location: row.location || "",
          date_applied: row.date_applied || new Date().toISOString().slice(0, 10),
          application_email: row.application_email || "",
          application_platform: row.application_platform || "",
          employment_type: VALID_EMPLOYMENT_TYPES.includes(row.employment_type) ? row.employment_type : "Full Time",
          salary_range: row.salary_range || "",
          job_description: row.job_description || "",
          job_url: row.job_url || "",
          status: VALID_STATUSES.includes(row.status) ? row.status : "Applied",
          notes: row.notes || "",
        });
      }
    });

    if (toInsert.length > 0) {
      const sanitized = toInsert.map((r) => {
        const s = sanitizeApplication({ ...r });
        return {
          ...r,
          job_role: s.job_role || r.job_role,
          company_name: s.company_name || r.company_name,
          location: s.location || r.location,
          job_description: s.job_description || r.job_description,
          salary_range: s.salary_range || r.salary_range,
          notes: s.notes || r.notes,
        };
      });
      csvService.insertMany(sanitized);
    }

    if (toUpdate.length > 0) {
      csvService.updateBatch(toUpdate);
    }

    return res.json({
      success: true,
      data: {
        imported: toInsert.length,
        updated: toUpdate.length,
        skipped: skipped.length,
        errorCount: errors.length,
        errors,
        skippedRows: skipped,
      },
      message: `Import complete: ${toInsert.length} imported, ${toUpdate.length} updated, ${skipped.length} skipped, ${errors.length} errors.`,
    });
    } finally {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to import: " + err.message });
  }
};

exports.template = (_req, res) => {
  try {
    const headers = ["job_role", "company_name", "location", "date_applied", "application_email", "application_platform", "employment_type", "salary_range", "status", "job_url", "job_description", "notes"];
    const example = ["Software Engineer", "Google", "Jakarta", "2026-01-15", "hr@google.com", "LinkedIn", "Full Time", "10M-20M IDR", "Applied", "https://careers.google.com/job", "Build scalable systems", "Applied via referral"];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    ws["!cols"] = headers.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(workbook, ws, "Template");

    const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=job_applications_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(Buffer.from(xlsxBuffer));
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to generate template: " + err.message });
  }
};

exports.statistics = (req, res) => {
  const records = csvService.getAll();

  const byStatus = {};
  const byPlatform = {};
  const byEmploymentType = {};
  const daily = {};
  const monthly = {};

  records.forEach((r) => {
    const s = r.status || "Unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;

    const p = r.application_platform || "Unknown";
    byPlatform[p] = (byPlatform[p] || 0) + 1;

    const e = r.employment_type || "Unknown";
    byEmploymentType[e] = (byEmploymentType[e] || 0) + 1;

    const d = r.date_applied;
    if (d) {
      daily[d] = (daily[d] || 0) + 1;
      const month = d.slice(0, 7);
      monthly[month] = (monthly[month] || 0) + 1;
    }
  });

  const sortedDaily = Object.fromEntries(Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)));
  const sortedMonthly = Object.fromEntries(Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)));

  return res.json({
    success: true,
    data: {
      total: records.length,
      by_status: byStatus,
      by_platform: byPlatform,
      by_employment_type: byEmploymentType,
      daily: sortedDaily,
      monthly: sortedMonthly,
    },
  });
};
