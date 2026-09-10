from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.applications import router as applications_router

app = FastAPI(
    title="Job Tracker API",
    description="API for saving job applications to Google Sheets.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
