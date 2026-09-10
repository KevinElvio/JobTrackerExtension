import re

MAX_JOB_DESCRIPTION_LENGTH = 10000

FORMULA_PREFIXES = ("=", "+", "-", "@")


def sanitize_string(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    value = re.sub(r"\r\n|\r|\n", "\n", value)
    value = re.sub(r"<[^>]+>", "", value)
    return value


def sanitize_formula(value: str) -> str:
    if value and value[0] in FORMULA_PREFIXES:
        return f"'{value}"
    return value


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

    spreadsheet_fields = [
        "job_role",
        "company_name",
        "location",
        "salary_range",
        "job_description",
        "notes",
    ]
    for field in spreadsheet_fields:
        if field in data and data[field] is not None:
            data[field] = sanitize_formula(data[field])

    return data
