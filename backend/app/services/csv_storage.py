import csv
import io
from pathlib import Path

from app.core.config import settings

HEADERS = [
    "application_id",
    "job_role",
    "company_name",
    "location",
    "date_applied",
    "application_email",
    "application_platform",
    "employment_type",
    "salary_range",
    "job_description",
    "job_url",
    "status",
    "notes",
]


def _ensure_file() -> None:
    file_path = Path(settings.CSV_FILE_PATH)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    if not file_path.exists():
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(HEADERS)


def get_all_records() -> list[dict]:
    _ensure_file()
    records = []
    with open(settings.CSV_FILE_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records


def get_record_by_id(application_id: str) -> dict | None:
    records = get_all_records()
    for record in records:
        if record.get("application_id") == application_id:
            return record
    return None


def append_row(row_data: dict) -> None:
    _ensure_file()
    with open(settings.CSV_FILE_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writerow(row_data)


def update_record(application_id: str, update_data: dict) -> bool:
    records = get_all_records()
    updated = False
    for i, record in enumerate(records):
        if record.get("application_id") == application_id:
            for key, value in update_data.items():
                if key in HEADERS and key != "application_id":
                    records[i][key] = value
            updated = True
            break

    if updated:
        with open(settings.CSV_FILE_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=HEADERS)
            writer.writeheader()
            writer.writerows(records)
    return updated


def delete_record(application_id: str) -> bool:
    records = get_all_records()
    original_len = len(records)
    records = [r for r in records if r.get("application_id") != application_id]

    if len(records) < original_len:
        with open(settings.CSV_FILE_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=HEADERS)
            writer.writeheader()
            writer.writerows(records)
        return True
    return False
