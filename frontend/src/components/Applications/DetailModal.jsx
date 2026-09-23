export default function DetailModal({ app, onClose, onEdit }) {
  if (!app) return null;

  const fields = [
    { label: "Company", value: app.company_name },
    { label: "Location", value: app.location },
    { label: "Date Applied", value: app.date_applied },
    { label: "Email", value: app.application_email },
    { label: "Platform", value: app.application_platform },
    { label: "Employment Type", value: app.employment_type },
    { label: "Salary Range", value: app.salary_range },
    { label: "Status", value: app.status, badge: true },
    { label: "Job URL", value: app.job_url, link: true },
    { label: "Job Description", value: app.job_description, full: true, desc: true },
    { label: "Notes", value: app.notes, full: true },
  ];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{app.job_role || "Application Details"}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="detail-body">
          <div className="detail-grid">
            {fields.filter((f) => f.value).map((f) => (
              <div key={f.label} className={`detail-item ${f.full ? "full-width" : ""}`}>
                <p className="detail-label">{f.label}</p>
                {f.badge ? (
                  <span className={`status-badge status-${(f.value || "").toLowerCase()}`}>{f.value}</span>
                ) : f.link ? (
                  <a href={f.value} target="_blank" rel="noreferrer" className="detail-link">{f.value}</a>
                ) : f.desc ? (
                  <div className="detail-value description">{f.value}</div>
                ) : (
                  <span className="detail-value">{f.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(app); }}>Edit</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
