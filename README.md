# Job Tracker

Aplikasi untuk melacak lowongan pekerjaan yang sudah dilamarkan, berjalan **sepenuhnya lokal** (data di mesin sendiri, tanpa cloud).

Terdapat dua antarmuka yang berbagi API & database yang sama:

| Komponen | Peran |
|---|---|
| **Web App** | Dashboard, statistik, manajemen applications, template cover letter, import CSV/XLSX |
| **Chrome Extension** | Ekstrak info lowongan dari halaman web (LinkedIn, JobStreet, Indeed, dll) lalu kirim ke API |

## Architecture

```
Chrome Extension ──► Express API ──► CSV file (backend/data/)
                        ▲
                        │ same origin (/api)
                        │
Browser ──► React SPA ─┘
```

Semua data disimpan di file CSV lokal (`backend/data/`), bukan database server.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Storage | Local CSV file (applications + templates) |
| Extension | Chrome Manifest V3 |
| Deploy lokal | Docker Compose (opsional) |

## Prerequisites

Pilih **salah satu** cara menjalankan:

- **Docker** — butuh [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) atau Docker Engine + Compose (Linux). Tidak perlu install Node.
- **Manual (npm)** — butuh **Node.js >= 18** dan npm (sudah termasuk). Disarankan Node 20+.

Google Chrome diperlukan hanya jika memakai extension.

---

## Quick Start A — Docker (recommended)

Satu perintah, tidak perlu install Node:

```bash
git clone <repo-url> && cd Job-tracker
docker compose up -d --build
```

Buka **http://localhost:8000**.

Perintah berguna lainnya:

```bash
docker compose logs -f      # lihat log
docker compose down         # hentikan
docker compose restart      # jalankan ulang
docker compose down -v      # hentikan + hapus data volume (RESET total)
```

> Bind ke `127.0.0.1` saja, jadi API tidak bisa diakses dari device lain di jaringan Anda.

## Quick Start B — Manual (tanpa Docker)

```bash
git clone <repo-url> && cd Job-tracker
npm run setup               # sekali saja: buat .env + install dependencies
```

Lalu pilih mode:

**Development** (hot reload, 2 port):

```bash
npm run dev
# Frontend -> http://localhost:3000  (Vite, proxy /api -> 8000)
# Backend  -> http://localhost:8000
```

**Production** (single process, 1 port):

```bash
npm run build && npm start
# App -> http://localhost:8000
```

Untuk menghentikan: `Ctrl+C`.

---

## Chrome Extension

Opsional — web app sudah berjalan tanpa extension.

1. Buka `chrome://extensions/`
2. Aktifkan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**, pilih folder `extension/`
4. Buka halaman lowongan (LinkedIn/JobStreet/Indeed), klik ikon extension, lalu **Confirm & Save**

Extension menyambung otomatis ke `http://localhost:8000` dan mem-probe endpoint `/health` saat dibuka. Jika backend Anda berjalan di address lain (misal `http://localhost:8000` di device berbeda), klik **⚙️ Settings** di popup dan isi URL-nya.

---

## Data & Backup

| Lokasi | Isi |
|---|---|
| `backend/data/applications.csv` | Seluruh lamaran |
| `backend/data/templates.csv` | Template cover letter |
| `backend/uploads/` | File import sementara (CSV/XLSX, maks 5MB) |

- File CSV **tidak ikut ter-commit** (di-`.gitignore`). Saat pertama dijalankan, file dibuat otomatis berisi header saja — Dashboard akan terlihat kosong sampai ada data masuk. Itu normal.
- **Backup** = copy folder `backend/data/`. Restore = taruh kembali ke lokasi yang sama lalu restart.
- **Import massal** bisa lewat menu Import di web app atau extension.

## Environment Variables

Dibaca dari `backend/.env` (mode manual). Docker tidak butuh file ini — konfigurasi sudah inline di `docker-compose.yml`.

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `8000` | Port server |
| `CSV_FILE_PATH` | `./data/applications.csv` | File data applications |
| `CSV_TEMPLATES_PATH` | `./data/templates.csv` | File data templates |

## API

Base URL: `http://localhost:8000`. Semua endpoint API ber-prefix `/api`.

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | Health check → `{ "status": "ok" }` |
| GET | `/api/applications` | List semua lamaran |
| POST | `/api/applications` | Tambah lamaran |
| GET | `/api/applications/:id` | Detail lamaran |
| PUT | `/api/applications/:id` | Update lamaran |
| DELETE | `/api/applications/:id` | Hapus lamaran |
| GET | `/api/statistics` | Statistik dashboard |
| GET | `/api/applications/template` | Download template XLSX |
| POST | `/api/applications/preview` | Preview import (multipart, field `file`) |
| POST | `/api/applications/import` | Eksekusi import (multipart: `file`, `duplicatePolicy`) |
| GET | `/api/templates` | List template |
| POST | `/api/templates` | Buat template |
| GET | `/api/templates/:id` | Detail template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Hapus template |
| POST | `/api/templates/:id/render` | Render template (body: `{ "values": {...} }`) |

Contoh body `POST /api/applications`:

```json
{
  "job_role": "Backend Engineer",
  "company_name": "Tokopedia",
  "location": "Jakarta, Indonesia",
  "date_applied": "2026-09-10",
  "application_email": "kevin@gmail.com",
  "application_platform": "LinkedIn",
  "employment_type": "Full Time",
  "salary_range": "IDR 12.000.000 - 18.000.000",
  "job_description": "We are looking for...",
  "job_url": "https://www.linkedin.com/jobs/view/123456",
  "status": "Applied",
  "notes": "Applied via referral."
}
```

## CSV Schema

**applications** (13 kolom):

`application_id, job_role, company_name, location, date_applied, application_email, application_platform, employment_type, salary_range, job_description, job_url, status, notes`

**templates** (8 kolom):

`template_id, name, description, content, dynamic_fields, created_at, updated_at`

---

## Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `docker compose` error: env file not found | Clone baru belum punya `backend/.env` | `cp backend/.env.example backend/.env`, lalu ulang |
| `EADDRINUSE` di port 8000 | Port sudah dipakai | `lsof -i :8000` lalu matikan prosesnya, atau ubah `PORT` di `.env` |
| `npm ci` gagal / lockfile out of sync | `package-lock.json` berbeda dengan `package.json` | Hapus lockfile dan folder `node_modules`, lalu jalankan `npm install` |
| Dashboard kosong | CSV baru dibuat, belum ada data | Normal. Tambah manual atau import via menu Import |
| Extension: "Cannot connect to server" | Backend mati, atau URL salah | Pastikan server jalan; cek/pilih ulang URL di **⚙️ Settings** popup |
| Buka `:8000` setelah `npm run build` tapi 404 | `frontend/dist` belum dicopy ke `backend/public` | Jalankan `npm run build` (root) — ini yang menyalinnya |
| Upload import gagal | File > 5MB atau format bukan `.csv/.xlsx/.xls` | Cek ukuran & ekstensi file |
| Data hilang saat `docker compose down` | Volume dihapus dengan `-v` | Jangan pakai `-v` jika ingin data tetap; backup folder `backend/data/` |

## Development

Struktur:

```
Job-tracker/
├── backend/          # Express API + CSV storage
├── frontend/         # React + Vite SPA
├── extension/        # Chrome MV3 extension
├── scripts/          # setup/dev/build helpers (root)
├── Dockerfile
└── docker-compose.yml
```

Script di root `package.json`:

| Perintah | Fungsi |
|---|---|
| `npm run setup` | Install dependencies + buat `.env` (sekali saja) |
| `npm run dev` | Jalankan backend + frontend dev server bersamaan |
| `npm run build` | Build frontend → `backend/public` |
| `npm start` | Jalankan backend (production, serves `backend/public`) |

## License

MIT
