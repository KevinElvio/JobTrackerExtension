from collections import defaultdict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import verify_token
from app.schemas.application import ApplicationResponse
from app.services.csv_storage import (
    delete_record,
    get_all_records,
    get_record_by_id,
    update_record,
)

router = APIRouter(prefix="/api", tags=["dashboard"])


class ApplicationUpdate(BaseModel):
    job_role: str | None = None
    company_name: str | None = None
    location: str | None = None
    date_applied: str | None = None
    application_email: str | None = None
    application_platform: str | None = None
    employment_type: str | None = None
    salary_range: str | None = None
    job_description: str | None = None
    job_url: str | None = None
    status: str | None = None
    notes: str | None = None


class StatisticsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    by_platform: dict[str, int]
    by_employment_type: dict[str, int]
    daily: dict[str, int]
    monthly: dict[str, int]


@router.get("/applications", dependencies=[Depends(verify_token)])
def list_applications():
    records = get_all_records()
    return {"success": True, "data": records, "total": len(records)}


@router.get("/applications/{application_id}", dependencies=[Depends(verify_token)])
def get_application(application_id: str):
    record = get_record_by_id(application_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )
    return {"success": True, "data": record}


@router.put("/applications/{application_id}", dependencies=[Depends(verify_token)])
def update_application(application_id: str, data: ApplicationUpdate):
    existing = get_record_by_id(application_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update.",
        )

    success = update_record(application_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update application.",
        )

    updated = get_record_by_id(application_id)
    return {"success": True, "data": updated, "message": "Application updated."}


@router.delete("/applications/{application_id}", dependencies=[Depends(verify_token)])
def delete_application(application_id: str):
    existing = get_record_by_id(application_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    success = delete_record(application_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete application.",
        )

    return {"success": True, "message": "Application deleted."}


@router.get("/statistics", dependencies=[Depends(verify_token)])
def get_statistics():
    records = get_all_records()

    by_status = defaultdict(int)
    by_platform = defaultdict(int)
    by_employment_type = defaultdict(int)
    daily = defaultdict(int)
    monthly = defaultdict(int)

    for record in records:
        status_val = record.get("status", "Unknown")
        by_status[status_val] += 1

        platform = record.get("application_platform", "Unknown")
        by_platform[platform] += 1

        emp_type = record.get("employment_type", "Unknown")
        by_employment_type[emp_type] += 1

        date_str = record.get("date_applied", "")
        if date_str:
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                daily[date_str] += 1
                month_key = date_obj.strftime("%Y-%m")
                monthly[month_key] += 1
            except ValueError:
                pass

    sorted_daily = dict(sorted(daily.items()))
    sorted_monthly = dict(sorted(monthly.items()))

    return {
        "success": True,
        "data": {
            "total": len(records),
            "by_status": dict(by_status),
            "by_platform": dict(by_platform),
            "by_employment_type": dict(by_employment_type),
            "daily": sorted_daily,
            "monthly": sorted_monthly,
        },
    }
