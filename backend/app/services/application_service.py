import uuid

from app.schemas.application import ApplicationCreate
from app.services.csv_storage import append_row
from app.services.duplicate_checker import check_duplicate
from app.services.sanitizer import sanitize_application


def generate_application_id() -> str:
    return f"job_{uuid.uuid4().hex[:12]}"


def create_application(data: ApplicationCreate) -> dict:
    app_data = data.model_dump()
    app_data = sanitize_application(app_data)

    job_url = str(data.job_url)

    if not data.force_save:
        duplicate = check_duplicate(job_url)
        if duplicate:
            return {
                "success": False,
                "code": "DUPLICATE_WARNING",
                "data": {
                    "application_id": duplicate["application_id"],
                    "job_url": duplicate["job_url"],
                },
                "message": "A job with this URL already exists.",
            }

    application_id = generate_application_id()

    row = {
        "application_id": application_id,
        "job_role": app_data.get("job_role", ""),
        "company_name": app_data.get("company_name", ""),
        "location": app_data.get("location", ""),
        "date_applied": str(data.date_applied),
        "application_email": app_data.get("application_email", ""),
        "application_platform": app_data.get("application_platform", ""),
        "employment_type": data.employment_type.value,
        "salary_range": app_data.get("salary_range", ""),
        "job_description": app_data.get("job_description", ""),
        "job_url": job_url,
        "status": data.status.value,
        "notes": app_data.get("notes", ""),
    }

    append_row(row)

    return {
        "success": True,
        "data": {"application_id": application_id},
        "message": "Application saved successfully.",
    }
