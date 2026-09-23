const fs = require("fs");
const path = require("path");
const config = require("../config");

const HEADERS = [
  "application_id",
  "job_role",
  "company_name",
  "location",
  "date_applied",
  "application_email",
  "application_platform",
  "employment_type",
  "salary_range",
  "job_description",
  "job_url",
  "status",
  "notes",
];

function ensureFile() {
  const filePath = path.resolve(config.csvPath);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, HEADERS.join(",") + "\n", "utf-8");
  }
}

function toCSVLine(fields) {
  return fields
    .map((field) => {
      const str = String(field ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    })
    .join(",");
}

function parseCSVContent(content) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 1 || currentRow[0] !== "") {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === "\r") i++;
      } else if (char === "\r") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.length > 1 || currentRow[0] !== "") {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  currentRow.push(currentField);
  if (currentRow.length > 1 || currentRow[0] !== "") {
    rows.push(currentRow);
  }

  return rows;
}

function getAll() {
  ensureFile();
  const filePath = path.resolve(config.csvPath);
  const content = fs.readFileSync(filePath, "utf-8");

  if (!content.trim()) return [];

  const rows = parseCSVContent(content);
  if (rows.length < 2) return [];

  const headers = rows[0];

  return rows.slice(1).filter((r) => r.length > 1 || r[0]).map((values) => {
    const record = {};
    headers.forEach((h, i) => {
      record[h] = values[i] || "";
    });
    return record;
  });
}

function getById(id) {
  return getAll().find((r) => r.application_id === id) || null;
}

function insert(record) {
  ensureFile();
  const filePath = path.resolve(config.csvPath);
  const line = toCSVLine(HEADERS.map((h) => record[h] || ""));
  fs.appendFileSync(filePath, line + "\n", "utf-8");
}

function update(id, data) {
  const records = getAll();
  const idx = records.findIndex((r) => r.application_id === id);

  if (idx === -1) return false;

  Object.keys(data).forEach((key) => {
    if (HEADERS.includes(key) && key !== "application_id") {
      records[idx][key] = data[key];
    }
  });

  const lines = [HEADERS.join(",")];
  records.forEach((r) => {
    lines.push(toCSVLine(HEADERS.map((h) => r[h] || "")));
  });

  const filePath = path.resolve(config.csvPath);
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  return true;
}

function remove(id) {
  const records = getAll();
  const filtered = records.filter((r) => r.application_id !== id);

  if (filtered.length === records.length) return false;

  const lines = [HEADERS.join(",")];
  filtered.forEach((r) => {
    lines.push(toCSVLine(HEADERS.map((h) => r[h] || "")));
  });

  const filePath = path.resolve(config.csvPath);
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  return true;
}

function insertMany(records) {
  ensureFile();
  const filePath = path.resolve(config.csvPath);
  const lines = records.map((record) => {
    return toCSVLine(HEADERS.map((h) => record[h] || ""));
  });
  fs.appendFileSync(filePath, lines.join("\n") + "\n", "utf-8");
}

function updateBatch(updates) {
  const records = getAll();
  let changed = false;

  updates.forEach(({ id, data }) => {
    const idx = records.findIndex((r) => r.application_id === id);
    if (idx !== -1) {
      Object.keys(data).forEach((key) => {
        if (HEADERS.includes(key) && key !== "application_id") {
          records[idx][key] = data[key];
        }
      });
      changed = true;
    }
  });

  if (changed) {
    const lines = [HEADERS.join(",")];
    records.forEach((r) => {
      lines.push(toCSVLine(HEADERS.map((h) => r[h] || "")));
    });
    const filePath = path.resolve(config.csvPath);
    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
  }

  return changed;
}

module.exports = { getAll, getById, insert, insertMany, update, updateBatch, remove, HEADERS };
