import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

export default function TemplatePreview({ template, onClose }) {
  const [values, setValues] = useState({});
  const [rendered, setRendered] = useState("");
  const [copied, setCopied] = useState(false);
  const [rendering, setRendering] = useState(false);

  const parseDynamicFields = (raw) => {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || [];
    } catch {
      return [];
    }
  };

  const fields = parseDynamicFields(template.dynamic_fields);

  const doRender = useCallback(async () => {
    setRendering(true);
    const res = await api.renderTemplate(template.template_id, values);
    if (res.success) {
      setRendered(res.data.rendered);
    }
    setRendering(false);
  }, [template.template_id, values]);

  useEffect(() => {
    doRender();
  }, [doRender]);

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rendered);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = rendered;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1>Use Template: {template.name}</h1>
        <button className="btn btn-ghost" onClick={onClose}>Back to Templates</button>
      </div>

      <div className="template-preview-layout">
        <div className="template-preview-form">
          <h2>Fill in the fields</h2>
          {fields.length === 0 ? (
            <p className="template-empty-fields">No dynamic fields in this template.</p>
          ) : (
            <div className="template-preview-fields">
              {fields.map((field) => (
                <div key={field.key} className="form-group">
                  <label>
                    {field.label}
                    {field.required && <span className="required-star">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={values[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="template-preview-output">
          <div className="template-output-header">
            <h2>Preview</h2>
            <button
              className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
              onClick={handleCopy}
              disabled={!rendered}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className={`template-output-content ${rendering ? "loading" : ""}`}>
            {rendered || "Fill in the fields to see the preview..."}
          </div>
        </div>
      </div>
    </div>
  );
}
