from fastapi import APIRouter, HTTPException

from app.schemas.tools import (
    InterviewPrepRequest,
    InterviewPrepResponse,
    ResumeReviewRequest,
    ResumeReviewResponse,
)
from app.services.tools_service import build_interview_prep, review_resume

router = APIRouter(prefix="/api/tools", tags=["career tools"])


@router.post("/resume-review", response_model=ResumeReviewResponse)
def resume_review(payload: ResumeReviewRequest):
    try:
        return review_resume(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/interview-prep", response_model=InterviewPrepResponse)
def interview_prep(payload: InterviewPrepRequest):
    try:
        return build_interview_prep(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
