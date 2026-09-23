import { useState, useEffect } from "react";

const FIELDS = ["job_role", "company_name", "location", "date_applied", "application_email", "application_platform", "employment_type", "salary_range", "status", "job_url", "job_description", "notes"];

const LABELS = {
  job_role: "Job Role",
  company_name: "Company Name",
  location: "Location",
  date_applied: "Date Applied",
  application_email: "Email",
  application_platform: "Platform",
  employment_type: "Employment Type",
  salary_range: "Salary Range",
  status: "Status",
  job_url: "Job URL",
  job_description: "Job Description",
  notes: "Notes",
};

export default function EditModal({ app, mode = "edit", onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isCreate = mode === "create";

  useEffect(() => {
    if (app || isCreate) {
      const initial = {};
      FIELDS.forEach((f) => { initial[f] = app?.[f] || ""; });
      if (isCreate) {
        initial.date_applied = new Date().toISOString().slice(0, 10);
        initial.employment_type = "Full Time";
        initial.status = "Applied";
      }
      setForm(initial);
      setError("");
    }
  }, [app, isCreate]);

  if (!app && !isCreate) return null;

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.job_role.trim() || !form.company_name.trim()) {
      setError("Job Role and Company Name are required.");
      return;
    }

    setSaving(true);
    setError("");
    const result = await onSave(form);
    if (!result.success) setError(result.message);
    setSaving(false);
  };

  const renderInput = (field) => {
    const isTextarea = ["job_description", "notes"].includes(field);
    const isDate = field === "date_applied";
    const isUrl = field === "job_url";
    const isEmail = field === "application_email";

    if (isTextarea) {
      return <textarea rows={field === "job_description" ? 4 : 2} value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)} />;
    }

    if (field === "application_platform") {
      return (
        <select value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}>
          {["LinkedIn", "JobStreet", "Indeed", "Company Website", "Glints", "Kalibrr", "Other"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    if (field === "employment_type") {
      return (
        <select value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}>
          {["Internship", "Full Time", "Part Time", "Contract", "Freelance"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    if (field === "status") {
      return (
        <select value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}>
          {["Applied", "Interview", "Rejected", "Offer", "Accepted", "Withdrawn"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    return <input type={isDate ? "date" : isUrl ? "url" : isEmail ? "email" : "text"} value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)} />;
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreate ? "Add Application" : "Edit Application"}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <div key={f} className={`form-group ${["job_description", "notes"].includes(f) ? "full-width" : ""}`}>
                <label>{LABELS[f]}{["job_role", "company_name"].includes(f) ? " *" : ""}</label>
                {renderInput(f)}
              </div>
            ))}
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : isCreate ? "Add Application" : "Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
