"""
Google Sheets Setup Script

This script creates the Applications sheet with proper headers and data validation.

Usage:
    python scripts/setup_google.py

Requirements:
    - Google Service Account JSON file
    - Google Spreadsheet ID
    - Set environment variables or edit .env file
"""

import os

import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

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

STATUS_OPTIONS = ["Applied", "Interview", "Rejected", "Offer", "Accepted", "Withdrawn"]
EMPLOYMENT_TYPE_OPTIONS = ["Internship", "Full Time", "Part Time", "Contract", "Freelance"]
PLATFORM_OPTIONS = ["LinkedIn", "JobStreet", "Indeed", "Company Website", "Glints", "Kalibrr", "Other"]


def main():
    spreadsheet_id = os.getenv("GOOGLE_SPREADSHEET_ID")
    service_account_email = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL")
    private_key = os.getenv("GOOGLE_PRIVATE_KEY", "").replace("\\n", "\n")

    if not all([spreadsheet_id, service_account_email, private_key]):
        print("Error: Please set GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY in .env")
        return

    creds = Credentials.from_service_account_info(
        {
            "type": "service_account",
            "client_email": service_account_email,
            "private_key": private_key,
        },
        scopes=SCOPES,
    )

    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(spreadsheet_id)

    try:
        sheet = spreadsheet.worksheet("Applications")
        print("Sheet 'Applications' already exists. Clearing content...")
        sheet.clear()
    except gspread.exceptions.WorksheetNotFound:
        print("Creating sheet 'Applications'...")
        sheet = spreadsheet.add_worksheet(title="Applications", rows=1000, cols=13)

    print("Writing headers...")
    sheet.update("A1:M1", [HEADERS])

    print("Setting up Status dropdown (Column L)...")
    status_rule = {
        "conditionType": "ONE_OF_LIST",
        "values": [{"userEnteredValue": opt} for opt in STATUS_OPTIONS],
    }
    sheet.set_data_validation("L2:L1000", status_rule)

    print("Setting up Employment Type dropdown (Column H)...")
    employment_rule = {
        "conditionType": "ONE_OF_LIST",
        "values": [{"userEnteredValue": opt} for opt in EMPLOYMENT_TYPE_OPTIONS],
    }
    sheet.set_data_validation("H2:H1000", employment_rule)

    print("Setting up Platform dropdown (Column G)...")
    platform_rule = {
        "conditionType": "ONE_OF_LIST",
        "values": [{"userEnteredValue": opt} for opt in PLATFORM_OPTIONS],
    }
    sheet.set_data_validation("G2:G1000", platform_rule)

    print("Setup complete!")
    print(f"Spreadsheet URL: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")


if __name__ == "__main__":
    main()
