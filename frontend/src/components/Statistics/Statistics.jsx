import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import { StatusChart, HorizontalBarChart, EmploymentChart, MonthlyChart, BigDailyChart } from "../Dashboard/MiniCharts";

function pad(n) { return String(n).padStart(2, "0"); }

function heatColor(count, dark) {
  if (count <= 0) return dark ? "#161b22" : "#ebedf0";
  if (count === 1) return "#9be9a8";
  if (count <= 3) return "#40c463";
  if (count <= 6) return "#30a14e";
  return "#216e39";
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
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

  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    days.push({ date: dateStr, count: (byDate[dateStr] || []).length, month: d.getMonth() });
  }
  while (days.length % 7 !== 0) days.push(null);

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthLabels = weeks.map((week, wi) => {
    const firstValid = week.find((d) => d);
    if (!firstValid) return "";
    if (wi === 0) return MONTHS[firstValid.month];
    const prevWeek = weeks[wi - 1];
    const prevValid = prevWeek ? prevWeek.find((d) => d) : null;
    if (prevValid && prevValid.month !== firstValid.month) return MONTHS[firstValid.month];
    return "";
  });

  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const selectedApps = selectedDate ? (byDate[selectedDate] || []) : [];

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
        <h3>Activity (last 1 year)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateRows: "repeat(7, 14px)", gap: 3, fontSize: 10, color: "var(--text-secondary)", textAlign: "right", paddingTop: 18 }}>
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>

          <div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks.length}, 14px)`, gap: 3, marginBottom: 4, fontSize: 10, color: "var(--text-secondary)", height: 14 }}>
              {monthLabels.map((m, i) => (
                <span key={i} style={{ whiteSpace: "nowrap" }}>{m}</span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateRows: "repeat(7, 14px)", gridAutoFlow: "column", gap: 3, width: "max-content" }}>
              {weeks.map((week, wi) =>
                week.map((day, di) =>
                  day ? (
                    <button
                      key={day.date}
                      type="button"
                      title={`${day.date}: ${day.count} application(s)`}
                      onClick={() => setSelectedDate(day.date)}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        border: "none",
                        background: heatColor(day.count, dark),
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ) : (
                    <div key={`empty-${wi}-${di}`} style={{ width: 14, height: 14 }} />
                  )
                )
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, marginTop: 8, color: "var(--text-secondary)" }}>
          <span>Less</span>
          {[0, 1, 2, 4, 7].map((c) => (
            <span key={c} style={{ width: 14, height: 14, borderRadius: 2, background: heatColor(c, dark), display: "inline-block" }} />
          ))}
          <span>More</span>
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
