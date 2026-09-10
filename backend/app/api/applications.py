from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import verify_token
from app.schemas.application import ApplicationCreate, ApplicationResponse
from app.services.application_service import create_application

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_new_application(
    data: ApplicationCreate,
    _: str = Depends(verify_token),
):
    try:
        result = create_application(data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save application: {str(e)}",
        )

    if not result["success"] and result.get("code") == "DUPLICATE_WARNING":
        return ApplicationResponse(
            success=False,
            data=result["data"],
            message=result["message"],
        )

    return ApplicationResponse(
        success=True,
        data=result["data"],
        message=result["message"],
    )
