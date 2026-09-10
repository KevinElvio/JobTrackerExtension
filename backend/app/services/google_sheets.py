import gspread
from google.oauth2.service_account import Credentials

from app.core.config import settings

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

SHEET_NAME = "Applications"

HEADERS = [
    "Application ID",
    "Job Role",
    "Company Name",
    "Location",
    "Date Applied",
    "Application Email",
    "Application Platform",
    "Employment Type",
    "Salary Range",
    "Job Description",
    "Job URL",
    "Status",
    "Notes",
]

URL_COLUMN_INDEX = 11  # Column K (1-indexed)


def _get_credentials() -> Credentials:
    private_key = settings.GOOGLE_PRIVATE_KEY.replace("\\n", "\n")
    return Credentials.from_service_account_info(
        {
            "type": "service_account",
            "client_email": settings.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            "private_key": private_key,
        },
        scopes=SCOPES,
    )


def _get_sheet() -> gspread.Worksheet:
    creds = _get_credentials()
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(settings.GOOGLE_SPREADSHEET_ID)
    return spreadsheet.worksheet(SHEET_NAME)


def get_all_urls() -> list[dict]:
    sheet = _get_sheet()
    rows = sheet.get_all_records()
    urls = []
    for row in rows:
        urls.append(
            {
                "application_id": row.get("Application ID", ""),
                "job_url": row.get("Job URL", ""),
            }
        )
    return urls


def append_row(row_data: list) -> str:
    sheet = _get_sheet()
    sheet.append_row(row_data, value_input_option="USER_ENTERED")
    return sheet.id
