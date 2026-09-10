# Job Tracker Browser Extension
## Final System Architecture & Technical Design Specification

> **Document Status:** Final MVP Specification  
> **Scope:** Personal use, Google Chrome only  
> **Backend:** Python + FastAPI  
> **Primary Storage:** Google Sheets  
> **Local Storage:** `chrome.storage.local` for application-email configuration only

---

# 1. Project Overview

**Job Tracker Browser Extension** adalah Chrome Extension personal untuk membantu mencatat lowongan pekerjaan yang telah dilamar.

Sistem mengambil informasi publik yang tersedia pada halaman lowongan melalui DOM, menampilkan hasil extraction kepada user untuk diperiksa dan diperbaiki, kemudian mengirim data yang sudah dikonfirmasi ke backend FastAPI. Backend melakukan validation, sanitization, duplicate detection, dan menyimpan record ke satu Google Sheet.

Sistem bukan recruitment-management platform penuh. Fokus MVP adalah **pencatatan aplikasi pekerjaan** secara cepat, terstruktur, dan konsisten.

## 1.1 Tujuan

1. Mengurangi input manual ketika mencatat lamaran.
2. Mengambil informasi lowongan yang tersedia secara publik dari DOM.
3. Memberikan review sebelum data disimpan.
4. Menyimpan data lamaran dalam satu Google Sheet.
5. Menyediakan konfigurasi beberapa email aplikasi secara lokal.
6. Mencegah duplicate secara tidak sengaja melalui warning.
7. Menjaga credential Google tetap berada di backend.

## 1.2 Batasan MVP

- Hanya Google Chrome.
- Hanya satu user/personal.
- Tidak ada user registration/login.
- Tidak menggunakan PostgreSQL/MySQL.
- Google Sheets adalah persistent storage utama.
- Tidak ada offline queue untuk data lowongan.
- Tidak ada fitur update status dari extension.
- Backend dijalankan secara lokal terlebih dahulu.

---

# 2. Functional Requirements

## 2.1 Job Data Extraction

Extension harus mencoba mengambil 8 informasi:

1. Job Role
2. Company Name
3. Location
4. Salary Range
5. Job Description
6. Job URL
7. Application Platform
8. Employment Type

Informasi yang tidak ditemukan **tidak dianggap sebagai error**. Field tersebut dibiarkan kosong dan user dapat mengisinya secara manual.

## 2.2 Review Before Save

Data hasil extraction tidak boleh langsung disimpan.

```text
Job Posting
    ↓
DOM Extraction
    ↓
Review Form
    ↓
User Edit / Confirm
    ↓
Confirm & Save
    ↓
FastAPI
    ↓
Google Sheets
```

## 2.3 Application Email

User dapat mempunyai beberapa email aplikasi.

- Disimpan di `chrome.storage.local`.
- Tidak disimpan sebagai konfigurasi di Google Sheets.
- Dapat ditambahkan melalui extension.
- Ditampilkan sebagai dropdown.
- Email terpilih dikirim dalam application payload.

Contoh:

```text
Application Email
[ kevin@gmail.com ▼ ]

kevin@gmail.com
kevin.dev@gmail.com
+ Add New Email
```

## 2.4 Application Platform

Platform menggunakan dropdown dengan opsi custom.

Default:

```text
LinkedIn
JobStreet
Indeed
Company Website
Glints
Kalibrr
Other
```

Platform dicoba dideteksi dari URL/hostname, tetapi user dapat mengubahnya.

## 2.5 Employment Type

Pilihan:

```text
Internship
Full Time
Part Time
Contract
Freelance
```

Extension mencoba mengambil informasi dari halaman dan menormalisasinya. Jika tidak ditemukan, user memilih manual.

## 2.6 Date Applied

MVP hanya menggunakan `Date Applied`; tidak ada `Date Saved`.

## 2.7 Status

Status disimpan di Google Sheets menggunakan dropdown:

```text
Applied
Interview
Rejected
Offer
Accepted
Withdrawn
```

`Applied` menjadi default ketika record dibuat melalui action Applied.

Status tidak dikelola melalui fitur update extension pada MVP dan dapat diubah manual di Google Sheets.

## 2.8 Job URL

- Diambil otomatis dari `window.location.href`.
- Ditampilkan pada review form.
- Read-only.
- Tetap disimpan pada Google Sheets.

---

# 3. User Interface Flow

```text
User opens job posting
        ↓
Clicks Job Tracker Extension
        ↓
Content Script extracts job information
        ↓
Popup opens with extracted data
        ↓
User reviews data
        ↓
User fills missing information
        ↓
User selects:
  - Application Email
  - Application Platform
  - Employment Type
        ↓
Status = Applied
        ↓
User clicks Confirm & Save
        ↓
Extension sends request to FastAPI
```

Review form:

```text
Job Role                  [________________]
Company Name              [________________]
Location                  [________________]
Date Applied              [2026-09-10]
Application Email         [______________ ▼]
Application Platform      [______________ ▼]
Employment Type           [______________ ▼]
Salary Range              [________________]
Job Description           [________________]
Job URL                   [read-only]
Status                    [Applied]
Notes                     [________________]

             [ Cancel ] [ Confirm & Save ]
```

---

# 4. Browser Extension Architecture

```text
extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── scripts/
│   ├── background.js
│   ├── content.js
│   ├── parser/
│   │   ├── linkedin.js
│   │   ├── jobstreet.js
│   │   ├── indeed.js
│   │   └── generic.js
│   └── utils/
│       ├── storage.js
│       ├── validator.js
│       └── platform.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 4.1 Content Script

Tanggung jawab:

- Membaca DOM.
- Mengambil `window.location.href`.
- Mengambil `document.title`.
- Menjalankan site-specific selector.
- Menjalankan generic fallback parser.
- Menghasilkan object extraction yang konsisten.

```javascript
{
  role: "",
  company: "",
  location: "",
  salary: "",
  description: "",
  url: "",
  platform: "",
  employment_type: ""
}
```

Prioritas:

```text
Site-specific parser
        ↓
Generic DOM parser
        ↓
Leave field empty
        ↓
User fills manually
```

---

# 5. Backend Architecture

Backend menggunakan **Python + FastAPI**.

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   └── applications.py
│   ├── schemas/
│   │   └── application.py
│   ├── services/
│   │   ├── application_service.py
│   │   ├── google_sheets.py
│   │   ├── duplicate_checker.py
│   │   └── sanitizer.py
│   └── core/
│       ├── config.py
│       └── security.py
├── tests/
│   ├── test_applications.py
│   ├── test_duplicate.py
│   └── test_sanitizer.py
├── requirements.txt
├── .env
├── .env.example
└── README.md
```

FastAPI bertanggung jawab untuk:

1. Authentication.
2. Request validation.
3. Sanitization.
4. Normalization.
5. Duplicate checking.
6. Google Sheets read.
7. Google Sheets append.
8. Error handling.
9. Consistent API responses.

---

# 6. API Contract

## 6.1 Create Application

```http
POST /api/applications
Content-Type: application/json
Authorization: Bearer <API_TOKEN>
```

Request:

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
  "job_description": "We are looking for a Backend Engineer...",
  "job_url": "https://www.linkedin.com/jobs/view/123456",
  "status": "Applied",
  "notes": "Applied through LinkedIn."
}
```

## 6.2 Success

```json
{
  "success": true,
  "data": {
    "application_id": "job_01JABC..."
  },
  "message": "Application saved successfully."
}
```

## 6.3 Duplicate

Backend mengembalikan warning, bukan langsung membuat record baru:

```json
{
  "success": false,
  "code": "DUPLICATE_WARNING",
  "data": {
    "application_id": "job_01JABC...",
    "job_url": "https://www.linkedin.com/jobs/view/123456"
  },
  "message": "A job with this URL already exists."
}
```

Extension menampilkan:

```text
This job has already been saved.

[ Cancel ] [ Save Anyway ]
```

Jika user memilih `Save Anyway`, extension mengirim request ulang dengan:

```json
{
  "force_save": true
}
```

Record baru kemudian dibuat.

---

# 7. Duplicate Detection

Job URL digunakan sebagai identifier utama untuk duplicate warning.

```text
POST /api/applications
        ↓
Read existing records
        ↓
Compare Job URL
        ↓
URL exists?
   │
   ├── No → Append
   │
   └── Yes → Warning
                ↓
          User decision
                │
          ┌─────┴─────┐
          │           │
       Cancel     Save Anyway
                      ↓
                    Append
```

Duplicate tidak meng-update record lama.

---

# 8. Google Sheets Schema

Satu sheet digunakan untuk job applications.

| Column | Field | Type | Required | Example |
|---|---|---|---|---|
| A | Application ID | String | Yes | `job_01JABC` |
| B | Job Role | String | Yes | `Backend Engineer` |
| C | Company Name | String | Yes | `Tokopedia` |
| D | Location | String | No | `Jakarta, Indonesia` |
| E | Date Applied | Date | Yes | `2026-09-10` |
| F | Application Email | String | Yes | `kevin@gmail.com` |
| G | Application Platform | String | Yes | `LinkedIn` |
| H | Employment Type | Enum | Yes | `Full Time` |
| I | Salary Range | String | No | `IDR 12.000.000 - 18.000.000` |
| J | Job Description | Text | Yes | `We are looking for...` |
| K | Job URL | URL/String | Yes | `https://...` |
| L | Status | Enum | Yes | `Applied` |
| M | Notes | Text | No | `Applied via referral.` |

Application ID dibuat oleh backend dan tidak bergantung pada nomor baris.

---

# 9. Google Sheets Integration

Flow:

```text
Chrome Extension
        │
        │ Bearer API Token
        ▼
     FastAPI
        │
        │ Service Account
        ▼
Google Sheets API
        │
        ▼
Google Sheet
```

Sebelum append:

```text
FastAPI
   ↓
Read existing rows
   ↓
Extract existing Job URLs
   ↓
Compare submitted URL
   ↓
Duplicate / Unique
```

Jika unique, backend menggunakan Google Sheets API untuk append row.

Google Service Account private key hanya berada di backend.

---

# 10. Local Storage

`chrome.storage.local` hanya digunakan untuk application-email configuration.

```json
{
  "applicationEmails": [
    "kevin@gmail.com",
    "kevin.dev@gmail.com"
  ]
}
```

Job application tidak disimpan sebagai offline queue.

Jika internet gagal:

```text
Confirm & Save
      ↓
Network Failure
      ↓
❌ Application was not saved
```

User harus mencoba kembali.

---

# 11. Validation

## 11.1 Client-Side

Extension melakukan validasi dasar:

- Required fields.
- Email format.
- URL format.
- Employment Type.
- Status.

## 11.2 Server-Side

FastAPI selalu melakukan validation ulang.

Contoh:

```python
from datetime import date
from pydantic import BaseModel, EmailStr, HttpUrl


class ApplicationCreate(BaseModel):
    job_role: str
    company_name: str
    location: str | None = None
    date_applied: date
    application_email: EmailStr
    application_platform: str
    employment_type: str
    salary_range: str | None = None
    job_description: str
    job_url: HttpUrl
    status: str = "Applied"
    notes: str | None = None
    force_save: bool = False
```

Client validation bukan security boundary.

---

# 12. Sanitization

Backend melakukan:

- Trim whitespace.
- Normalize line breaks.
- Remove unnecessary HTML.
- Enforce maximum text size.
- Protect against spreadsheet formula injection.

Input seperti:

```text
"   Backend Engineer   "
```

menjadi:

```text
"Backend Engineer"
```

Data yang dimulai dengan:

```text
=
+
-
@
```

ditangani agar tidak dieksekusi sebagai spreadsheet formula.

---

# 13. Job Description

Job Description disimpan secara penuh sampai batas:

```text
MAX_JOB_DESCRIPTION_LENGTH = 10000
```

Jika lebih panjang, backend membatasi data yang disimpan menjadi maksimum 10.000 karakter.

---

# 14. Employment Type Normalization

Contoh:

```text
Full-time
Full time
Full-Time
```

menjadi:

```text
Full Time
```

Mapping:

```text
Intern / Internship → Internship
Full-time / Full time / Full-Time → Full Time
Part-time / Part time / Part-Time → Part Time
Contract / Contractor → Contract
Freelance / Freelancer → Freelance
```

Jika tidak dapat dipetakan, field dibiarkan kosong dan user memilih manual.

---

# 15. Platform Detection

Platform dideteksi berdasarkan hostname.

```text
linkedin.com → LinkedIn
jobstreet.co.id → JobStreet
indeed.com → Indeed
```

Website lain dapat menjadi:

```text
Company Website
```

atau:

```text
Other
```

User dapat mengganti hasil tersebut.

---

# 16. Error Handling

## Network Error

```text
Request Failed
      ↓
Network Error
      ↓
Application was not saved
```

## Validation Error

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Job role is required."
}
```

## Authentication Error

```http
401 Unauthorized
```

## Google Sheets Error

Backend menangani:

- Invalid Service Account.
- Spreadsheet permission error.
- Invalid Spreadsheet ID.
- Google API unavailable.
- Request timeout.

Credential tidak boleh dikirim ke extension.

---

# 17. Security

## Extension → FastAPI

```http
Authorization: Bearer <API_TOKEN>
```

## FastAPI → Google

Menggunakan Google Service Account.

## Environment Variables

```env
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
API_TOKEN=...
```

`.env` tidak boleh masuk repository.

Sediakan `.env.example`.

Karena extension bersifat client-side, API token yang ditanam di extension tidak dapat dianggap sebagai secret sempurna. Untuk MVP personal, token digunakan sebagai basic access control.

---

# 18. Status Management

Status dropdown di Google Sheets:

```text
Applied
Interview
Rejected
Offer
Accepted
Withdrawn
```

Extension hanya memberikan default:

```text
Applied
```

Tidak ada endpoint update status pada MVP.

---

# 19. Development Phases

## Phase 1 — Google Sheets

1. Buat spreadsheet.
2. Buat sheet Applications.
3. Tambahkan header.
4. Buat dropdown Status.
5. Buat Service Account.
6. Berikan akses spreadsheet kepada Service Account.

## Phase 2 — FastAPI

1. Setup project.
2. Configuration.
3. Authentication.
4. Pydantic schema.
5. `POST /api/applications`.
6. Google Sheets service.
7. Duplicate checker.
8. Sanitizer.

## Phase 3 — Extension

1. Manifest V3.
2. Popup.
3. Content script.
4. Background service worker.
5. Message passing.
6. Local email configuration.

## Phase 4 — Extraction

1. Generic DOM parser.
2. LinkedIn parser.
3. JobStreet parser.
4. Indeed parser.
5. Platform detection.
6. Employment type normalization.

## Phase 5 — Review & Submission

1. Review form.
2. Missing-field editing.
3. Email dropdown.
4. Platform dropdown/custom.
5. Employment type dropdown.
6. Confirm & Save.
7. FastAPI integration.

## Phase 6 — Reliability

1. Server validation.
2. Sanitization.
3. Duplicate detection.
4. Duplicate warning.
5. Force save.
6. Error handling.

## Phase 7 — Testing

1. Parser tests.
2. Validation tests.
3. Sanitization tests.
4. Duplicate tests.
5. Google Sheets integration.
6. End-to-end browser testing.

---

# 20. Testing Requirements

## Extraction

Test:

```text
Complete DOM
Missing Salary
Missing Location
Missing Employment Type
Unexpected DOM
Unknown Website
```

Expected:

```text
Available → Extract
Unavailable → Empty
```

## Validation

```text
Valid application → PASS
Missing job role → FAIL
Missing company → FAIL
Invalid email → FAIL
Invalid URL → FAIL
Invalid employment type → FAIL
Invalid status → FAIL
```

## Duplicate

```text
New URL
    → Save

Existing URL
    → Warning

Existing URL + force_save=true
    → New record
```

## Network

```text
FastAPI available
    → Save

FastAPI unavailable
    → Error

Google API unavailable
    → Error
```

No job data is persisted locally after failure.

---

# 21. Acceptance Criteria

- [ ] Chrome Extension dapat dijalankan di Google Chrome.
- [ ] Content script dapat membaca URL halaman.
- [ ] Extension mencoba mengambil 8 informasi dari DOM.
- [ ] Missing information tidak menyebabkan extraction gagal keseluruhan.
- [ ] Missing fields dapat diisi manual.
- [ ] Platform dapat dideteksi dari URL.
- [ ] Platform dapat dipilih manual/custom.
- [ ] Employment Type dapat dinormalisasi.
- [ ] Employment Type dapat dipilih manual.
- [ ] User dapat menyimpan beberapa application email.
- [ ] Email disimpan menggunakan `chrome.storage.local`.
- [ ] Email dapat dipilih melalui dropdown.
- [ ] User dapat mengedit hasil extraction.
- [ ] User harus melakukan review sebelum save.
- [ ] Job URL ditampilkan read-only.
- [ ] Status default adalah `Applied`.
- [ ] Request menggunakan Bearer token.
- [ ] FastAPI melakukan server-side validation.
- [ ] FastAPI melakukan sanitization.
- [ ] Backend menggunakan Google Service Account.
- [ ] Backend membaca Google Sheets sebelum append.
- [ ] Duplicate URL menghasilkan warning.
- [ ] User dapat memilih `Save Anyway`.
- [ ] Duplicate yang dipaksa tetap menjadi record baru.
- [ ] Google Sheets menerima record baru.
- [ ] Job data tidak disimpan lokal ketika network gagal.
- [ ] Job Description maksimum 10.000 karakter.
- [ ] Status tersedia sebagai dropdown di Google Sheets.
- [ ] Backend dapat dijalankan secara lokal.

---

# 22. Non-Functional Requirements

## Performance

- Extraction tidak boleh membuat UI popup menjadi tidak responsif.
- API request dilakukan secara asynchronous.
- Tidak ada kebutuhan high-throughput karena sistem personal.
- Bottleneck utama diperkirakan berasal dari network dan Google Sheets API, bukan local FastAPI processing.

## Maintainability

- Parser dipisahkan per platform.
- Business logic dipisahkan dari API route.
- Google Sheets integration berada pada service tersendiri.
- Validation menggunakan schema.
- Sanitizer dan duplicate checker dipisahkan.

## Reliability

- Network failure menghasilkan error yang jelas.
- Google API failure tidak mengekspos credential.
- Duplicate tidak langsung membuat record tanpa konfirmasi user.

## Security

- Service Account hanya berada di backend.
- `.env` tidak masuk repository.
- Server-side validation wajib dilakukan.
- Spreadsheet input disanitasi.

---

# 23. Final Architecture

```text
                    ┌─────────────────────┐
                    │   Google Chrome     │
                    │                     │
                    │  Job Tracker        │
                    │  Extension          │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               │ Bearer Token
                               ▼
                    ┌─────────────────────┐
                    │       FastAPI       │
                    │                     │
                    │ Validation          │
                    │ Sanitization        │
                    │ Duplicate Check     │
                    │ Google API Service  │
                    └──────────┬──────────┘
                               │
                               │ Service Account
                               ▼
                    ┌─────────────────────┐
                    │   Google Sheets     │
                    │                     │
                    │ Job Applications    │
                    └─────────────────────┘

       ┌──────────────────────────────────────┐
       │ chrome.storage.local                 │
       │                                      │
       │ Application Email Configuration      │
       └──────────────────────────────────────┘
```

## Final Technology Stack

| Layer | Technology |
|---|---|
| Browser | Google Chrome |
| Extension | Chrome Manifest V3 |
| UI | HTML + CSS + JavaScript |
| Extension Logic | JavaScript |
| Backend | Python |
| API Framework | FastAPI |
| Validation | Pydantic |
| Extension → Backend Auth | Bearer API Token |
| Backend → Google Auth | Service Account |
| Persistent Storage | Google Sheets |
| Local Configuration | `chrome.storage.local` |
| Initial Deployment | Localhost |
| Additional Database | None |

---

# 24. Out of Scope

- Multi-user authentication.
- User registration.
- PostgreSQL/MySQL.
- Cloud deployment.
- Automatic status synchronization.
- Update application dari extension.
- Delete application dari extension.
- Offline job queue.
- Resume parsing.
- AI job matching.
- Automatic application submission.
- Recruitment workflow management.
- Interview scheduling.
- Notification/reminder system.
- Analytics dashboard.

---

# 25. Future Enhancements

1. Cloud deployment.
2. Stronger authentication.
3. Database tambahan jika kebutuhan meningkat.
4. Application update dari extension.
5. Search/filter.
6. Dashboard statistik.
7. Interview tracking.
8. Follow-up reminders.
9. Resume matching.
10. AI-assisted extraction.
11. Additional job platforms.
12. Advanced duplicate detection.

---

# 26. Conclusion

Job Tracker MVP menggunakan arsitektur sederhana:

```text
Chrome Extension
       ↓
FastAPI
       ↓
Google Sheets
```

Extension bertanggung jawab terhadap pengambilan informasi publik dari halaman, review, editing, dan konfigurasi email.

FastAPI bertanggung jawab terhadap authentication, validation, sanitization, duplicate detection, dan integrasi Google Sheets.

Google Sheets menjadi single source of persistent job application records, sedangkan `chrome.storage.local` hanya menyimpan konfigurasi email.

Arsitektur sengaja tidak menggunakan database tambahan atau offline queue agar kompleksitas MVP tetap rendah, tetapi struktur kode tetap modular sehingga fitur dapat dikembangkan setelah versi pertama stabil.
