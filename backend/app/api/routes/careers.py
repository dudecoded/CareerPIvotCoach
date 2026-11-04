from fastapi import APIRouter, HTTPException

from app.schemas.assessment import AssessmentCreate, AssessmentResult
from app.services.career_service import analyze_career

router = APIRouter(prefix="/api/careers", tags=["careers"])


@router.post("/analyze", response_model=AssessmentResult)
def analyze(payload: AssessmentCreate):
    try:
        return analyze_career(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
