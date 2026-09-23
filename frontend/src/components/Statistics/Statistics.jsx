import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";
import { StatusChart, HorizontalBarChart, EmploymentChart, MonthlyChart, BigDailyChart } from "../Dashboard/MiniCharts";

export default function Statistics() {
  const [stats, setStats] = useState(null);

  const loadData = useCallback(async () => {
    const res = await api.getStatistics();
    if (res.success) setStats(res.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!stats) return <div className="page active"><p>Loading...</p></div>;

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
    </div>
  );
}
