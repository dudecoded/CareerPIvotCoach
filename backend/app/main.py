from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.assessments import router as assessments_router
from app.api.routes.careers import router as careers_router
from app.api.routes.coach import router as coach_router
from app.api.routes.tools import router as tools_router
from app.db.database import Base, engine
from app.models.assessment import Assessment  # noqa: F401 - registers model metadata

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CareerPivotCoach API",
    description="Career transition planning and assessment API",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(assessments_router)
app.include_router(careers_router)
app.include_router(coach_router)
app.include_router(tools_router)


@app.get("/")
def root():
    return {"message": "Welcome to CareerPivotCoach API", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
