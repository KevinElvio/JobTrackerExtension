from app.services.google_sheets import get_all_urls


def check_duplicate(job_url: str) -> dict | None:
    existing_records = get_all_urls()
    for record in existing_records:
        if record["job_url"] == job_url:
            return {
                "application_id": record["application_id"],
                "job_url": record["job_url"],
            }
    return None
