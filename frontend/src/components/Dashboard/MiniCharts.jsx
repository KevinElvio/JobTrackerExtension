import { useEffect, useRef } from "react";
import {
  Chart,
  DoughnutController, BarController, PieController, LineController,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from "chart.js";

Chart.register(
  DoughnutController, BarController, PieController, LineController,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler,
);

function getColors() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  return { text: isDark ? "#94a3b8" : "#64748b", grid: isDark ? "#334155" : "#f1f5f9" };
}

const PALETTE = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#06b6d4", "#8b5cf6", "#ec4899"];

function ChartCanvas({ id, config }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy();
    if (!canvasRef.current || !config) return;

    const ctx = canvasRef.current.getContext("2d");
    chartRef.current = new Chart(ctx, config);

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [config]);

  return <canvas ref={canvasRef} id={id} />;
}

export function StatusChart({ data }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: colors.text, padding: 8, font: { size: 11 } } } },
    },
  };

  return <ChartCanvas id="chart-status" config={config} />;
}

export function PlatformChart({ data }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE.slice(0, labels.length), borderRadius: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: colors.text, font: { size: 10 }, stepSize: 1 }, grid: { color: colors.grid } },
      },
    },
  };

  return <ChartCanvas id="chart-platform" config={config} />;
}

export function EmploymentChart({ data }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "pie",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE.slice(0, labels.length), borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: colors.text, padding: 8, font: { size: 11 } } } },
    },
  };

  return <ChartCanvas id="chart-employment" config={config} />;
}

export function DailyChart({ data }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Applications",
        data: values,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: "#3b82f6",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text, font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: colors.text, font: { size: 10 }, stepSize: 1 }, grid: { color: colors.grid } },
      },
    },
  };

  return <ChartCanvas id="chart-daily" config={config} />;
}

export function HorizontalBarChart({ data, id }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE.slice(0, labels.length), borderRadius: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text, stepSize: 1 }, grid: { color: colors.grid } },
        y: { ticks: { color: colors.text }, grid: { display: false } },
      },
    },
  };

  return <ChartCanvas id={id} config={config} />;
}

export function MonthlyChart({ data, id }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Applications", data: values, backgroundColor: "rgba(59,130,246,0.7)", borderRadius: 6 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { display: false } },
        y: { ticks: { color: colors.text, stepSize: 1 }, grid: { color: colors.grid } },
      },
    },
  };

  return <ChartCanvas id={id} config={config} />;
}

export function BigDailyChart({ data, id }) {
  const colors = getColors();
  const labels = Object.keys(data);
  const values = Object.values(data);

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Applications",
        data: values,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#3b82f6",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: colors.text }, grid: { display: false } },
        y: { ticks: { color: colors.text, stepSize: 1 }, grid: { color: colors.grid } },
      },
    },
  };

  return <ChartCanvas id={id} config={config} />;
}
