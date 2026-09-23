const templateCsvService = require("../services/templateCsvService");
const { generateTemplateId } = require("../utils/helpers");

function sanitizeTemplate(data) {
  const sanitized = {};
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string") {
      sanitized[key] = data[key].trim();
    } else {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
}

function validateTemplate(data, requireFields = false) {
  if (requireFields && (!data.name?.trim())) {
    return "name is required.";
  }
  if (data.dynamic_fields !== undefined) {
    try {
      const fields = typeof data.dynamic_fields === "string"
        ? JSON.parse(data.dynamic_fields)
        : data.dynamic_fields;
      if (!Array.isArray(fields)) {
        return "dynamic_fields must be an array.";
      }
      for (const f of fields) {
        if (!f.key || !f.label) {
          return "Each dynamic field must have key and label.";
        }
      }
    } catch {
      return "dynamic_fields must be valid JSON.";
    }
  }
  return null;
}

exports.create = (req, res) => {
  try {
    const data = req.body;

    const validationError = validateTemplate(data, true);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const sanitized = sanitizeTemplate(data);
    const now = new Date().toISOString().slice(0, 10);

    const record = {
      template_id: generateTemplateId(),
      name: sanitized.name || "",
      description: sanitized.description || "",
      content: sanitized.content || "",
      dynamic_fields: typeof sanitized.dynamic_fields === "string"
        ? sanitized.dynamic_fields
        : JSON.stringify(sanitized.dynamic_fields || []),
      created_at: now,
      updated_at: now,
    };

    templateCsvService.insert(record);

    return res.status(201).json({
      success: true,
      data: { template_id: record.template_id },
      message: "Template created successfully.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.list = (_req, res) => {
  const records = templateCsvService.getAll();
  return res.json({ success: true, data: records, total: records.length });
};

exports.getById = (req, res) => {
  const record = templateCsvService.getById(req.params.id);
  if (!record) {
    return res.status(404).json({ success: false, message: "Template not found." });
  }
  return res.json({ success: true, data: record });
};

exports.update = (req, res) => {
  const existing = templateCsvService.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Template not found." });
  }

  const data = {};
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  });

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: "No data to update." });
  }

  const validationError = validateTemplate({ ...existing, ...data }, true);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const sanitized = sanitizeTemplate(data);
  sanitized.updated_at = new Date().toISOString().slice(0, 10);

  if (sanitized.dynamic_fields !== undefined && typeof sanitized.dynamic_fields !== "string") {
    sanitized.dynamic_fields = JSON.stringify(sanitized.dynamic_fields);
  }

  const ok = templateCsvService.update(req.params.id, sanitized);

  if (!ok) {
    return res.status(500).json({ success: false, message: "Failed to update." });
  }

  const updated = templateCsvService.getById(req.params.id);
  return res.json({ success: true, data: updated, message: "Template updated." });
};

exports.remove = (req, res) => {
  const existing = templateCsvService.getById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Template not found." });
  }

  const ok = templateCsvService.remove(req.params.id);
  if (!ok) {
    return res.status(500).json({ success: false, message: "Failed to delete." });
  }

  return res.json({ success: true, message: "Template deleted." });
};

exports.render = (req, res) => {
  try {
    const record = templateCsvService.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    const values = req.body.values || {};
    let content = record.content;

    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const rendered = content.replace(placeholderRegex, (match, key) => {
      return values[key] !== undefined ? values[key] : match;
    });

    return res.json({ success: true, data: { rendered } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
