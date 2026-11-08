import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import { StatusChart, HorizontalBarChart, EmploymentChart, MonthlyChart, BigDailyChart } from "../Dashboard/MiniCharts";

function pad(n) { return String(n).padStart(2, "0"); }

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const loadData = useCallback(async () => {
    const [statsRes, appsRes] = await Promise.all([api.getStatistics(), api.getApplications()]);
    if (statsRes.success) setStats(statsRes.data);
    if (appsRes.success) setApps(appsRes.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!stats) return <div className="page active"><p>Loading...</p></div>;

  const byDate = apps.reduce((acc, a) => {
    const d = a.date_applied;
    if (!d) return acc;
    if (!acc[d]) acc[d] = [];
    acc[d].push(a);
    return acc;
  }, {});

  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;
    cells.push({ day: d, date: dateStr, count: (byDate[dateStr] || []).length });
  }

  const selectedApps = selectedDate ? (byDate[selectedDate] || []) : [];

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    const d = new Date(y, m, 1);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    setSelectedDate(null);
  };

  return (
    <div className="page active">
      <div className="page-header"><h1>Statistics</h1></div>

      <div className="stats-charts-grid">
        <div className="chart-box"><h3>Applications by Status</h3><StatusChart data={stats.by_status} /></div>
        <div className="chart-box"><h3>Applications by Platform</h3><HorizontalBarChart data={stats.by_platform} id="chart-stat-platform" /></div>
        <div className="chart-box"><h3>By Employment Type</h3><EmploymentChart data={stats.by_employment_type} /></div>
        <div className="chart-box"><h3>Monthly Trend</h3><MonthlyChart data={stats.monthly} id="chart-stat-monthly" /></div>
      </div>

      <div className="chart-box chart-full"><h3>Daily Applications</h3><BigDailyChart data={stats.daily} id="chart-stat-daily" /></div>

      <div className="chart-box chart-full">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>&larr; Prev</button>
          <h3 style={{ margin: 0 }}>Calendar: {month}</h3>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next &rarr;</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center", fontSize: 12 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} style={{ fontWeight: 600, padding: 4 }}>{d}</div>
          ))}
          {cells.map((c, idx) => (
            <button
              key={idx}
              type="button"
              disabled={!c}
              onClick={() => c && setSelectedDate(c.date)}
              style={{
                padding: 6,
                borderRadius: 6,
                border: "1px solid var(--border, #e2e8f0)",
                background: c ? (c.count > 0 ? "rgba(59,130,246,0.15)" : "transparent") : "transparent",
                cursor: c ? "pointer" : "default",
                opacity: c ? 1 : 0,
                fontWeight: c && c.count > 0 ? 700 : 400,
              }}
            >
              {c ? c.day : ""}
              {c && c.count > 0 && <div style={{ fontSize: 10, color: "#3b82f6" }}>{c.count}</div>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: "8px 0" }}>
            {selectedDate ? `Applications on ${selectedDate}` : "Select a date to see details"}
          </h4>
          <div className="recent-list">
            {selectedDate && selectedApps.length === 0 && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>No applications on this date</p>
            )}
            {selectedApps.map((r) => (
              <div key={r.application_id} className="recent-item">
                <div className="recent-item-info">
                  <span className="recent-item-role">{r.job_role}</span>
                  <span className="recent-item-company">{r.company_name} &middot; {r.application_platform}</span>
                </div>
                <span className={`status-badge status-${(r.status || "").toLowerCase()}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
