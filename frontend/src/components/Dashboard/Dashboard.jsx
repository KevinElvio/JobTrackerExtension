import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import StatCard from "./StatCard";
import { StatusChart, PlatformChart, EmploymentChart, DailyChart } from "./MiniCharts";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  const loadData = useCallback(async () => {
    const [statsRes, appsRes] = await Promise.all([api.getStatistics(), api.getApplications()]);
    if (statsRes.success) setStats(statsRes.data);
    if (appsRes.success) {
      const sorted = [...appsRes.data].sort((a, b) => (b.date_applied || "").localeCompare(a.date_applied || ""));
      setRecent(sorted.slice(0, 5));
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!stats) return <div className="page active"><p>Loading...</p></div>;

  return (
    <div className="page active">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-ghost" onClick={loadData}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="stats-row">
        <StatCard label="Total" value={stats.total} type="total" />
        <StatCard label="Applied" value={stats.by_status?.Applied || 0} type="applied" />
        <StatCard label="Interview" value={stats.by_status?.Interview || 0} type="interview" />
        <StatCard label="Offer" value={stats.by_status?.Offer || 0} type="offer" />
        <StatCard label="Accepted" value={stats.by_status?.Accepted || 0} type="accepted" />
        <StatCard label="Rejected" value={stats.by_status?.Rejected || 0} type="rejected" />
      </div>

      <div className="charts-row">
        <div className="chart-box chart-small"><h3>Status</h3><StatusChart data={stats.by_status} /></div>
        <div className="chart-box chart-small"><h3>Platform</h3><PlatformChart data={stats.by_platform} /></div>
        <div className="chart-box chart-small"><h3>Employment</h3><EmploymentChart data={stats.by_employment_type} /></div>
      </div>

      <div className="chart-box chart-full"><h3>Daily Applications</h3><DailyChart data={stats.daily} /></div>

      <div className="recent-section">
        <h3>Recent Applications</h3>
        <div className="recent-list">
          {recent.length === 0 && <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>No applications yet</p>}
          {recent.map((r) => (
            <div key={r.application_id} className="recent-item">
              <div className="recent-item-info">
                <span className="recent-item-role">{r.job_role}</span>
                <span className="recent-item-company">{r.company_name} &middot; {r.date_applied}</span>
              </div>
              <span className={`status-badge status-${(r.status || "").toLowerCase()}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
