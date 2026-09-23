import { useState, useEffect } from "react";
import { api } from "../../api/client";

export default function TemplateForm({ template, onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [dynamicFields, setDynamicFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setDescription(template.description || "");
      setContent(template.content || "");
      try {
        const fields = typeof template.dynamic_fields === "string"
          ? JSON.parse(template.dynamic_fields)
          : template.dynamic_fields || [];
        setDynamicFields(fields);
      } catch {
        setDynamicFields([]);
      }
    }
  }, [template]);

  const handleAddField = () => {
    setDynamicFields((prev) => [
      ...prev,
      { key: "", label: "", type: "text", required: false },
    ]);
  };

  const handleRemoveField = (index) => {
    setDynamicFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, key, value) => {
    setDynamicFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  };

  const extractPlaceholders = () => {
    const regex = /\{\{(\w+)\}\}/g;
    const found = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) {
      found.add(match[1]);
    }
    return Array.from(found);
  };

  const syncFieldsFromContent = () => {
    const placeholders = extractPlaceholders();
    const existingKeys = new Set(dynamicFields.map((f) => f.key));

    const newFields = placeholders
      .filter((key) => !existingKeys.has(key))
      .map((key) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        type: "text",
        required: true,
      }));

    if (newFields.length > 0) {
      setDynamicFields((prev) => [...prev, ...newFields]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }

    setSaving(true);

    const data = {
      name: name.trim(),
      description: description.trim(),
      content,
      dynamic_fields: dynamicFields,
    };

    let res;
    if (template) {
      res = await api.updateTemplate(template.template_id, data);
    } else {
      res = await api.createTemplate(data);
    }

    setSaving(false);

    if (res.success) {
      onSave();
    } else {
      setError(res.message || "Failed to save template.");
    }
  };

  const placeholders = extractPlaceholders();

  return (
    <div className="page active">
      <div className="page-header">
        <h1>{template ? "Edit Template" : "New Template"}</h1>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="template-form-section">
          <h2>Basic Info</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Template Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Professional Application"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
          </div>
        </div>

        <div className="template-form-section">
          <div className="template-section-header">
            <h2>Template Content</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={syncFieldsFromContent}>
              Sync fields from placeholders
            </button>
          </div>
          <p className="template-hint">
            Use <code>{"{{field_name}}"}</code> for dynamic placeholders.
          </p>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Dear {{company_name}},\n\nI am writing to express my interest in the {{job_role}} position...`}
            className="template-content-editor"
          />
          {placeholders.length > 0 && (
            <div className="template-placeholders">
              <span className="template-placeholders-label">Detected:</span>
              {placeholders.map((p) => (
                <span key={p} className="template-placeholder-tag">{"{{" + p + "}}"}</span>
              ))}
            </div>
          )}
        </div>

        <div className="template-form-section">
          <div className="template-section-header">
            <h2>Dynamic Fields</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddField}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Field
            </button>
          </div>
          {dynamicFields.length === 0 ? (
            <p className="template-empty-fields">No dynamic fields. Add fields or use "Sync fields from placeholders" above.</p>
          ) : (
            <div className="template-fields-list">
              {dynamicFields.map((field, index) => (
                <div key={index} className="template-field-row">
                  <input
                    type="text"
                    placeholder="key (e.g. company_name)"
                    value={field.key}
                    onChange={(e) => handleFieldChange(index, "key", e.target.value)}
                    className="template-field-key"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. Company Name)"
                    value={field.label}
                    onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                    className="template-field-label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(index, "type", e.target.value)}
                    className="template-field-type"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <label className="template-field-required">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                    />
                    Req
                  </label>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveField(index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : template ? "Update Template" : "Create Template"}
          </button>
        </div>
      </form>
    </div>
  );
}
