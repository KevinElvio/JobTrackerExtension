from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from app.api.applications import router as applications_router
from app.api.dashboard import router as dashboard_router

app = FastAPI(
    title="Job Tracker API",
    description="API for saving job applications to CSV.",
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
app.include_router(dashboard_router)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")
