from app.services.csv_storage import get_all_records


def check_duplicate(job_url: str) -> dict | None:
    records = get_all_records()
    for record in records:
        if record.get("job_url") == job_url:
            return {
                "application_id": record.get("application_id", ""),
                "job_url": record.get("job_url", ""),
            }
    return None
