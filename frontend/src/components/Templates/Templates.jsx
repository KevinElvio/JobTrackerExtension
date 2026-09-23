import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import TemplateForm from "./TemplateForm";
import TemplatePreview from "./TemplatePreview";

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const loadData = useCallback(async () => {
    const res = await api.getTemplates();
    if (res.success) setTemplates(res.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = () => {
    setEditTemplate(null);
    setShowForm(true);
  };

  const handleEdit = (tpl) => {
    setEditTemplate(tpl);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await api.deleteTemplate(id);
    loadData();
  };

  const handleSave = async () => {
    setShowForm(false);
    setEditTemplate(null);
    loadData();
  };

  const handleUse = (tpl) => {
    setPreviewTemplate(tpl);
  };

  const parseDynamicFields = (raw) => {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw || [];
    } catch {
      return [];
    }
  };

  if (showForm) {
    return (
      <TemplateForm
        template={editTemplate}
        onClose={() => { setShowForm(false); setEditTemplate(null); }}
        onSave={handleSave}
      />
    );
  }

  if (previewTemplate) {
    return (
      <TemplatePreview
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    );
  }

  return (
    <div className="page active">
      <div className="page-header">
        <h1>Templates</h1>
        <div className="header-tools">
          <button className="btn btn-primary" onClick={handleCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Template
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="table-card">
          <div className="table-empty">
            <p>No templates yet. Create your first template to get started.</p>
          </div>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map((tpl) => {
            const fields = parseDynamicFields(tpl.dynamic_fields);
            return (
              <div key={tpl.template_id} className="template-card">
                <div className="template-card-header">
                  <h3>{tpl.name}</h3>
                  <span className="template-field-count">{fields.length} fields</span>
                </div>
                {tpl.description && (
                  <p className="template-desc">{tpl.description}</p>
                )}
                <div className="template-preview-text">
                  {(tpl.content || "").slice(0, 150)}{(tpl.content || "").length > 150 ? "..." : ""}
                </div>
                <div className="template-card-footer">
                  <span className="template-date">Updated: {tpl.updated_at}</span>
                  <div className="template-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleUse(tpl)}>Use</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(tpl)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tpl.template_id)}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
