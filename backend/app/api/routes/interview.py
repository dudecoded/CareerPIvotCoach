from fastapi import APIRouter, HTTPException

from app.schemas.interview import InterviewFrameAnalysis, InterviewFrameRequest
from app.services.interview_vision_service import analyze_interview_frame

router = APIRouter(prefix="/api/interview", tags=["AI Interview Studio"])


@router.post("/analyze-frame", response_model=InterviewFrameAnalysis)
def analyze_frame(payload: InterviewFrameRequest):
    try:
        return analyze_interview_frame(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
