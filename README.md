# Job Tracker Extension

Chrome Extension personal untuk mencatat lowongan pekerjaan yang telah dilamar ke Google Sheets.

## Architecture

```
Chrome Extension → FastAPI → Google Sheets
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Browser | Google Chrome |
| Extension | Chrome Manifest V3 |
| UI | HTML + CSS + JavaScript |
| Backend | Python + FastAPI |
| Storage | Google Sheets |

## Prerequisites

- Google Chrome
- Docker & Docker Compose
- Google Cloud Project with:
  - Google Sheets API enabled
  - Service Account created
  - Service Account JSON key file

## Setup

### 1. Google Sheets Setup

1. Create a new Google Spreadsheet
2. Copy the Spreadsheet ID from the URL
3. Create a Service Account in Google Cloud Console
4. Download the Service Account JSON key
5. Share the spreadsheet with the Service Account email
6. Set environment variables in `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
API_TOKEN=your_random_api_token
```

7. Run the setup script to create headers and dropdowns:

```bash
cd scripts
pip install -r ../backend/requirements.txt
python setup_google.py
```

### 2. Backend Setup

```bash
cd backend
docker compose up -d
```

The API will be available at `http://localhost:8000`.

Test with:

```bash
curl http://localhost:8000/health
```

### 3. Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

### 4. Configure API Token

Edit `extension/popup/popup.js` and replace `YOUR_API_TOKEN_HERE` with your actual API token.

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

## Google Sheets Schema

| Column | Field | Type |
|--------|-------|------|
| A | Application ID | String |
| B | Job Role | String |
| C | Company Name | String |
| D | Location | String |
| E | Date Applied | Date |
| F | Application Email | String |
| G | Application Platform | String |
| H | Employment Type | Enum |
| I | Salary Range | String |
| J | Job Description | Text |
| K | Job URL | URL |
| L | Status | Enum |
| M | Notes | Text |

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
