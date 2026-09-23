import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import Pagination from "./Pagination";
import DetailModal from "./DetailModal";
import EditModal from "./EditModal";
import ImportModal from "./ImportModal";

const PAGE_SIZE = 10;

function escapeCsv(val) {
  const s = String(val || "").replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailApp, setDetailApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    const res = await api.getApplications();
    if (res.success) setApps(res.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = apps.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.job_role || "").toLowerCase().includes(q) ||
        (r.company_name || "").toLowerCase().includes(q) ||
        (r.location || "").toLowerCase().includes(q) ||
        (r.application_platform || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (val) => { setFilter(val); setPage(1); };
  const handleSearchChange = (val) => { setSearch(val); setPage(1); };

  const handleDelete = async (id) => {
    if (!confirm("Delete this application?")) return;
    await api.deleteApplication(id);
    loadData();
  };

  const handleSave = async (data) => {
    const result = await api.updateApplication(editApp.application_id, data);
    if (result.success) {
      setEditApp(null);
      loadData();
    }
    return result;
  };

  const handleCreate = async (data) => {
    const result = await api.createApplication(data);
    if (result.success) {
      setCreating(false);
      loadData();
    }
    return result;
  };

  const handleDownload = () => {
    if (!filtered.length) { alert("No data to download"); return; }
    const headers = ["Job Role", "Company Name", "Location", "Date Applied", "Email", "Platform", "Employment Type", "Salary Range", "Status", "Job URL", "Job Description", "Notes"];
    const keys = ["job_role", "company_name", "location", "date_applied", "application_email", "application_platform", "employment_type", "salary_range", "status", "job_url", "job_description", "notes"];
    const rows = filtered.map((r) => keys.map((k) => escapeCsv(r[k])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job_applications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page active">
      <div className="page-header">
        <h1>Applications</h1>
        <div className="header-tools">
          <select className="input-sm" value={filter} onChange={(e) => handleFilterChange(e.target.value)}>
            <option value="">All Status</option>
            {["Applied", "Interview", "Rejected", "Offer", "Accepted", "Withdrawn"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input type="text" className="input-sm" placeholder="Search..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setCreating(true)}>Add Application</button>
          <button className="btn btn-ghost" onClick={() => setImporting(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import CSV/Excel
          </button>
          <button className="btn btn-ghost" onClick={handleDownload}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Job Role</th><th>Company</th><th>Location</th><th>Date</th>
              <th>Platform</th><th>Type</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr><td colSpan="8" className="table-empty">No applications found</td></tr>
            )}
            {pageData.map((r) => (
              <tr key={r.application_id} className="row-clickable" onClick={() => setDetailApp(r)}>
                <td title={r.job_role}>{r.job_role}</td>
                <td title={r.company_name}>{r.company_name}</td>
                <td title={r.location}>{r.location}</td>
                <td>{r.date_applied}</td>
                <td>{r.application_platform}</td>
                <td>{r.employment_type}</td>
                <td><span className={`status-badge status-${(r.status || "").toLowerCase()}`}>{r.status}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditApp(r)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.application_id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      <DetailModal app={detailApp} onClose={() => setDetailApp(null)} onEdit={(app) => { setDetailApp(null); setEditApp(app); }} />
      <EditModal app={editApp} onClose={() => setEditApp(null)} onSave={handleSave} />
      {creating && <EditModal mode="create" onClose={() => setCreating(false)} onSave={handleCreate} app={{}} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onComplete={loadData} />}
    </div>
  );
}
