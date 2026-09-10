import re
import html

MAX_JOB_DESCRIPTION_LENGTH = 10000


def sanitize_string(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    value = re.sub(r"\r\n|\r|\n", "\n", value)
    # Convert block tags to newlines before stripping
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"</(p|div|li|h[1-6]|tr)>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]+", " ", value)
    return value.strip()


def sanitize_application(data: dict) -> dict:
    text_fields = [
        "job_role",
        "company_name",
        "location",
        "application_email",
        "application_platform",
        "salary_range",
        "notes",
    ]
    for field in text_fields:
        if field in data and data[field] is not None:
            data[field] = sanitize_string(data[field])

    if "job_description" in data and data["job_description"]:
        data["job_description"] = sanitize_string(data["job_description"])
        if len(data["job_description"]) > MAX_JOB_DESCRIPTION_LENGTH:
            data["job_description"] = data["job_description"][:MAX_JOB_DESCRIPTION_LENGTH]

    return data
