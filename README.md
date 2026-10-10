# Job Tracker Extension

Chrome Extension personal untuk mencatat lowongan pekerjaan yang telah dilamar ke file CSV lokal.

## Architecture

```
Chrome Extension → FastAPI → CSV File
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Browser | Google Chrome |
| Extension | Chrome Manifest V3 |
| UI | HTML + CSS + JavaScript |
| Backend | Python + FastAPI |
| Storage | Local CSV file |

## Prerequisites

- Google Chrome
- Docker & Docker Compose

## Setup

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
CSV_FILE_PATH=./data/applications.csv
API_TOKEN=your_random_api_token
```

Start the backend:

```bash
docker compose up -d
```

The API will be available at `http://localhost:8000`.

Test with:

```bash
curl http://localhost:8000/health
```

### 2. Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

### 3. Configure Extension

1. Click the extension icon in Chrome.
2. Click **⚙️ Settings** (or it will automatically prompt on first run).
3. Set your **API Base URL** (default: `http://localhost:8000`) and **API Token** matching your `backend/.env`.
4. Click **Save Settings**.

## Usage

1. Open a job posting page (LinkedIn, JobStreet, Indeed, or any website)
2. Click the Job Tracker extension icon
3. The form will be pre-filled with extracted job information
4. Review and edit any fields
5. Select your application email, platform, and employment type
6. Click "Confirm & Save"

## API

### POST /api/applications

Create a new job application.

**Headers:**
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Request Body:**
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

**Success Response:**
```json
{
  "success": true,
  "data": {
    "application_id": "job_01JABC..."
  },
  "message": "Application saved successfully."
}
```

**Duplicate Response:**
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

## CSV Schema

| Field | Type |
|-------|------|
| application_id | String |
| job_role | String |
| company_name | String |
| location | String |
| date_applied | Date |
| application_email | String |
| application_platform | String |
| employment_type | Enum |
| salary_range | String |
| job_description | Text |
| job_url | URL |
| status | Enum |
| notes | Text |

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Extension

Load the `extension/` folder as unpacked extension in Chrome.

## License

MIT
