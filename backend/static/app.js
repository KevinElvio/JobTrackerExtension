const API_BASE = 'http://localhost:8000';
let TOKEN = localStorage.getItem('api_token') || '';
let applications = [];
let stats = {};
let charts = {};
let currentPage = 'dashboard';
let tablePage = 1;
const PAGE_SIZE = 10;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Auth
async function checkAuth() {
  if (!TOKEN) return showAuth();
  try {
    const res = await fetch(`${API_BASE}/api/applications`, { headers: authHeaders() });
    if (res.ok) { hideAuth(); loadAll(); return; }
  } catch {}
  showAuth();
}

function authHeaders() { return { 'Authorization': `Bearer ${TOKEN}` }; }
function showAuth() { $('#auth-screen').style.display = 'flex'; }
function hideAuth() { $('#auth-screen').style.display = 'none'; }

$('#login-btn').onclick = () => {
  TOKEN = $('#token-input').value.trim();
  if (!TOKEN) return;
  localStorage.setItem('api_token', TOKEN);
  checkAuth();
};

$('#token-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#login-btn').click(); });

// Theme
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeLabel(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeLabel(next);
  updateChartColors();
}

function updateThemeLabel(theme) {
  const span = $('#theme-toggle span');
  if (span) span.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
}

$('#theme-toggle').onclick = toggleTheme;

// Sidebar
$('#sidebar-toggle').onclick = () => $('#sidebar').classList.toggle('collapsed');

$$('.nav-item').forEach(item => {
  item.onclick = e => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) switchPage(page);
  };
});

function switchPage(page) {
  currentPage = page;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  if (page === 'applications') { tablePage = 1; renderTable(); }
}

// Data
async function loadAll() {
  await Promise.all([loadApplications(), loadStats()]);
  renderDashboard();
  renderTable();
  renderStatsCharts();
}

async function loadApplications() {
  try {
    const res = await fetch(`${API_BASE}/api/applications`, { headers: authHeaders() });
    const data = await res.json();
    applications = data.data || [];
  } catch { applications = []; }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/statistics`, { headers: authHeaders() });
    const data = await res.json();
    stats = data.data || {};
  } catch { stats = {}; }
}

// Dashboard
function renderDashboard() {
  const s = stats;
  $('#stat-total').textContent = s.total || 0;
  $('#stat-applied').textContent = s.by_status?.Applied || 0;
  $('#stat-interview').textContent = s.by_status?.Interview || 0;
  $('#stat-offer').textContent = s.by_status?.Offer || 0;
  $('#stat-accepted').textContent = s.by_status?.Accepted || 0;
  $('#stat-rejected').textContent = s.by_status?.Rejected || 0;

  renderDashboardCharts();
  renderRecent();
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#334155' : '#f1f5f9',
  };
}

function chartDefaults() {
  const c = getChartColors();
  return { text: c.text, grid: c.grid };
}

function renderDashboardCharts() {
  const d = chartDefaults();
  const statusLabels = Object.keys(stats.by_status || {});
  const statusValues = Object.values(stats.by_status || {});
  const platformLabels = Object.keys(stats.by_platform || {});
  const platformValues = Object.values(stats.by_platform || {});
  const empLabels = Object.keys(stats.by_employment_type || {});
  const empValues = Object.values(stats.by_employment_type || {});
  const dailyLabels = Object.keys(stats.daily || {});
  const dailyValues = Object.values(stats.daily || {});

  const statusColors = ['#3b82f6','#f59e0b','#ef4444','#10b981','#06b6d4','#8b5cf6'];
  const platformColors = ['#3b82f6','#f59e0b','#ef4444','#10b981','#8b5cf6','#ec4899'];

  destroyChart('chart-status');
  destroyChart('chart-platform');
  destroyChart('chart-employment');
  destroyChart('chart-daily');

  charts['chart-status'] = new Chart($('#chart-status'), {
    type: 'doughnut',
    data: { labels: statusLabels, datasets: [{ data: statusValues, backgroundColor: statusColors, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: d.text, padding: 8, font: { size: 11 } } } } }
  });

  charts['chart-platform'] = new Chart($('#chart-platform'), {
    type: 'bar',
    data: { labels: platformLabels, datasets: [{ data: platformValues, backgroundColor: platformColors.slice(0, platformLabels.length), borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: d.text, font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: d.text, font: { size: 10 }, stepSize: 1 }, grid: { color: d.grid } } } }
  });

  charts['chart-employment'] = new Chart($('#chart-employment'), {
    type: 'pie',
    data: { labels: empLabels, datasets: [{ data: empValues, backgroundColor: statusColors.slice(0, empLabels.length), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: d.text, padding: 8, font: { size: 11 } } } } }
  });

  charts['chart-daily'] = new Chart($('#chart-daily'), {
    type: 'line',
    data: { labels: dailyLabels, datasets: [{ label: 'Applications', data: dailyValues, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#3b82f6' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: d.text, font: { size: 10 } }, grid: { display: false } }, y: { ticks: { color: d.text, font: { size: 10 }, stepSize: 1 }, grid: { color: d.grid } } } }
  });
}

function renderRecent() {
  const recent = [...applications].sort((a, b) => (b.date_applied || '').localeCompare(a.date_applied || '')).slice(0, 5);
  const list = $('#recent-list');
  if (!recent.length) { list.innerHTML = '<p style="color:var(--text-secondary);font-size:13px;">No applications yet</p>'; return; }
  list.innerHTML = recent.map(r => `
    <div class="recent-item">
      <div class="recent-item-info">
        <span class="recent-item-role">${esc(r.job_role)}</span>
        <span class="recent-item-company">${esc(r.company_name)} &middot; ${esc(r.date_applied)}</span>
      </div>
      <span class="status-badge status-${(r.status||'').toLowerCase()}">${esc(r.status)}</span>
    </div>
  `).join('');
}

// Statistics
function renderStatsCharts() {
  const d = chartDefaults();
  const statusLabels = Object.keys(stats.by_status || {});
  const statusValues = Object.values(stats.by_status || {});
  const platformLabels = Object.keys(stats.by_platform || {});
  const platformValues = Object.values(stats.by_platform || {});
  const empLabels = Object.keys(stats.by_employment_type || {});
  const empValues = Object.values(stats.by_employment_type || {});
  const monthlyLabels = Object.keys(stats.monthly || {});
  const monthlyValues = Object.values(stats.monthly || {});
  const dailyLabels = Object.keys(stats.daily || {});
  const dailyValues = Object.values(stats.daily || {});

  const colors = ['#3b82f6','#f59e0b','#ef4444','#10b981','#06b6d4','#8b5cf6','#ec4899'];

  destroyChart('chart-stat-status');
  destroyChart('chart-stat-platform');
  destroyChart('chart-stat-employment');
  destroyChart('chart-stat-monthly');
  destroyChart('chart-stat-daily');

  charts['chart-stat-status'] = new Chart($('#chart-stat-status'), {
    type: 'doughnut',
    data: { labels: statusLabels, datasets: [{ data: statusValues, backgroundColor: colors.slice(0, statusLabels.length), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: d.text, padding: 10, font: { size: 12 } } } } }
  });

  charts['chart-stat-platform'] = new Chart($('#chart-stat-platform'), {
    type: 'bar',
    data: { labels: platformLabels, datasets: [{ data: platformValues, backgroundColor: colors.slice(0, platformLabels.length), borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: d.text, stepSize: 1 }, grid: { color: d.grid } }, y: { ticks: { color: d.text }, grid: { display: false } } } }
  });

  charts['chart-stat-employment'] = new Chart($('#chart-stat-employment'), {
    type: 'pie',
    data: { labels: empLabels, datasets: [{ data: empValues, backgroundColor: colors.slice(0, empLabels.length), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: d.text, padding: 10, font: { size: 12 } } } } }
  });

  charts['chart-stat-monthly'] = new Chart($('#chart-stat-monthly'), {
    type: 'bar',
    data: { labels: monthlyLabels, datasets: [{ label: 'Applications', data: monthlyValues, backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: d.text }, grid: { display: false } }, y: { ticks: { color: d.text, stepSize: 1 }, grid: { color: d.grid } } } }
  });

  charts['chart-stat-daily'] = new Chart($('#chart-stat-daily'), {
    type: 'line',
    data: { labels: dailyLabels, datasets: [{ label: 'Applications', data: dailyValues, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#3b82f6' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: d.text }, grid: { display: false } }, y: { ticks: { color: d.text, stepSize: 1 }, grid: { color: d.grid } } } }
  });
}

function updateChartColors() { renderDashboardCharts(); renderStatsCharts(); }

function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

// Table with Pagination
function getFilteredApplications() {
  let data = [...applications];
  const statusFilter = $('#filter-status').value;
  const search = $('#filter-search').value.toLowerCase();

  if (statusFilter) data = data.filter(r => r.status === statusFilter);
  if (search) data = data.filter(r =>
    (r.job_role||'').toLowerCase().includes(search) ||
    (r.company_name||'').toLowerCase().includes(search) ||
    (r.location||'').toLowerCase().includes(search) ||
    (r.application_platform||'').toLowerCase().includes(search)
  );

  return data;
}

function renderTable() {
  const data = getFilteredApplications();
  const tbody = $('#table-body');
  const empty = $('#table-empty');

  if (!data.length) { tbody.innerHTML = ''; empty.style.display = 'block'; $('#pagination').innerHTML = ''; return; }
  empty.style.display = 'none';

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  if (tablePage > totalPages) tablePage = totalPages;
  const start = (tablePage - 1) * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = pageData.map(r => `
    <tr class="row-clickable" onclick="openDetail('${r.application_id}')">
      <td title="${esc(r.job_role)}">${esc(r.job_role)}</td>
      <td title="${esc(r.company_name)}">${esc(r.company_name)}</td>
      <td title="${esc(r.location)}">${esc(r.location)}</td>
      <td>${esc(r.date_applied)}</td>
      <td>${esc(r.application_platform)}</td>
      <td>${esc(r.employment_type)}</td>
      <td><span class="status-badge status-${(r.status||'').toLowerCase()}">${esc(r.status)}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="actions-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${r.application_id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteApp('${r.application_id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPagination(totalPages, data.length);
}

function renderPagination(totalPages, totalItems) {
  const container = $('#pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" onclick="goToPage(${tablePage - 1})" ${tablePage === 1 ? 'disabled' : ''}>Prev</button>`;

  const maxVisible = 5;
  let startPage = Math.max(1, tablePage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) html += `<span class="page-info">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-btn ${i === tablePage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) html += `<span class="page-info">...</span>`;
    html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  html += `<button class="page-btn" onclick="goToPage(${tablePage + 1})" ${tablePage === totalPages ? 'disabled' : ''}>Next</button>`;
  html += `<span class="page-info">${totalItems} data</span>`;

  container.innerHTML = html;
}

window.goToPage = function(page) {
  const data = getFilteredApplications();
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  tablePage = page;
  renderTable();
};

$('#filter-status').onchange = () => { tablePage = 1; renderTable(); };
$('#filter-search').oninput = () => { tablePage = 1; renderTable(); };

// Detail Modal
window.openDetail = function(id) {
  const app = applications.find(a => a.application_id === id);
  if (!app) return;

  $('#detail-title').textContent = app.job_role || 'Application Details';

  const fields = [
    { label: 'Company', value: app.company_name },
    { label: 'Location', value: app.location },
    { label: 'Date Applied', value: app.date_applied },
    { label: 'Email', value: app.application_email },
    { label: 'Platform', value: app.application_platform },
    { label: 'Employment Type', value: app.employment_type },
    { label: 'Salary Range', value: app.salary_range },
    { label: 'Status', value: app.status, badge: true },
    { label: 'Job URL', value: app.job_url, link: true },
    { label: 'Job Description', value: app.job_description, full: true, desc: true },
    { label: 'Notes', value: app.notes, full: true },
  ];

  const grid = fields.filter(f => f.value).map(f => {
    let val = esc(f.value);
    if (f.badge) val = `<span class="status-badge status-${(f.value||'').toLowerCase()}">${esc(f.value)}</span>`;
    else if (f.link) val = `<a href="${esc(f.value)}" target="_blank" style="color:var(--accent);word-break:break-all;">${esc(f.value)}</a>`;
    else if (f.desc) val = `<div class="detail-value description">${esc(f.value)}</div>`;
    else val = `<span class="detail-value">${val}</span>`;
    return `<div class="detail-item${f.full ? ' full-width' : ''}"><p class="detail-label">${f.label}</p>${val}</div>`;
  }).join('');

  $('#detail-body').innerHTML = `<div class="detail-grid">${grid}</div>`;

  $('#detail-modal').style.display = 'flex';

  $('#detail-edit-btn').onclick = () => {
    $('#detail-modal').style.display = 'none';
    openEdit(id);
  };
};

$('#detail-close').onclick = () => $('#detail-modal').style.display = 'none';
$('#detail-close-btn').onclick = () => $('#detail-modal').style.display = 'none';
$('#detail-modal').onclick = e => { if (e.target === $('#detail-modal')) $('#detail-modal').style.display = 'none'; };

// Edit Modal
window.openEdit = function(id) {
  const app = applications.find(a => a.application_id === id);
  if (!app) return;
  $('#edit-id').value = app.application_id;
  ['job_role','company_name','location','date_applied','application_email','application_platform','employment_type','salary_range','status','job_url','job_description','notes'].forEach(f => {
    const el = $(`#edit-${f}`);
    if (el) el.value = app[f] || '';
  });
  $('#edit-modal').style.display = 'flex';
};

$('#modal-close').onclick = () => $('#edit-modal').style.display = 'none';
$('#edit-cancel').onclick = () => $('#edit-modal').style.display = 'none';
$('#edit-modal').onclick = e => { if (e.target === $('#edit-modal')) $('#edit-modal').style.display = 'none'; };

$('#edit-form').onsubmit = async e => {
  e.preventDefault();
  const id = $('#edit-id').value;
  const body = {};
  ['job_role','company_name','location','date_applied','application_email','application_platform','employment_type','salary_range','status','job_url','job_description','notes'].forEach(f => {
    body[f] = $(`#edit-${f}`).value;
  });
  try {
    const res = await fetch(`${API_BASE}/api/applications/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      $('#edit-modal').style.display = 'none';
      await loadAll();
    }
  } catch {}
};

// Delete
window.deleteApp = async function(id) {
  if (!confirm('Delete this application?')) return;
  try {
    await fetch(`${API_BASE}/api/applications/${id}`, { method: 'DELETE', headers: authHeaders() });
    await loadAll();
  } catch {}
};

// Download CSV
$('#download-csv-btn').onclick = () => {
  const data = getFilteredApplications();
  if (!data.length) { alert('No data to download'); return; }

  const headers = ['Job Role','Company Name','Location','Date Applied','Email','Platform','Employment Type','Salary Range','Status','Job URL','Job Description','Notes'];
  const keys = ['job_role','company_name','location','date_applied','application_email','application_platform','employment_type','salary_range','status','job_url','job_description','notes'];

  const escapeCsv = (val) => {
    const s = (val || '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const rows = data.map(r => keys.map(k => escapeCsv(r[k])).join(','));
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `job_applications_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Refresh
$('#refresh-btn').onclick = loadAll;

// Helpers
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

// Init
initTheme();
checkAuth();
