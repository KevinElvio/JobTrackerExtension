from datetime import date
from enum import Enum

from pydantic import BaseModel, EmailStr, HttpUrl, field_validator


class EmploymentType(str, Enum):
    INTERNSHIP = "Internship"
    FULL_TIME = "Full Time"
    PART_TIME = "Part Time"
    CONTRACT = "Contract"
    FREELANCE = "Freelance"


class Status(str, Enum):
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    REJECTED = "Rejected"
    OFFER = "Offer"
    ACCEPTED = "Accepted"
    WITHDRAWN = "Withdrawn"


class ApplicationCreate(BaseModel):
    job_role: str
    company_name: str
    location: str | None = None
    date_applied: date
    application_email: EmailStr
    application_platform: str
    employment_type: EmploymentType
    salary_range: str | None = None
    job_description: str
    job_url: HttpUrl
    status: Status = Status.APPLIED
    notes: str | None = None
    force_save: bool = False

    @field_validator("job_role", "company_name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required.")
        return v


class ApplicationResponse(BaseModel):
    success: bool
    data: dict | None = None
    message: str
