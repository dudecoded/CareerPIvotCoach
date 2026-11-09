from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.routes.auth import current_user
from app.db.database import get_db
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.assessment import AssessmentCreate, AssessmentHistoryItem, AssessmentHistoryResponse, AssessmentResult
from app.services.career_service import analyze_career
router = APIRouter(prefix="/api/assessments", tags=["assessments"])
@router.post("", response_model=AssessmentResult, status_code=201)
def create_assessment(payload: AssessmentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try: result = analyze_career(payload)
    except ValueError as exc: raise HTTPException(status_code=422, detail=str(exc)) from exc
    record = Assessment(user_id=user.id,current_role=result.current_role,target_role=result.target_role,experience_years=result.experience_years,skills=payload.skills,readiness_score=result.readiness_score,matched_skills=result.matched_skills,skill_gaps=[g.model_dump() for g in result.skill_gaps],recommendation=result.recommendation,roadmap=[p.model_dump() for p in result.roadmap],score_note=result.score_note)
    db.add(record); db.commit(); db.refresh(record)
    return AssessmentResult(id=record.id,current_role=record.current_role,target_role=record.target_role,experience_years=record.experience_years,readiness_score=record.readiness_score,matched_skills=record.matched_skills,skill_gaps=record.skill_gaps,recommendation=record.recommendation,roadmap=record.roadmap,score_note=record.score_note,created_at=record.created_at)
@router.get("", response_model=AssessmentHistoryResponse)
def list_assessments(limit: int = 20, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if limit < 1 or limit > 100: raise HTTPException(status_code=422, detail="limit must be between 1 and 100")
    records = db.query(Assessment).filter(Assessment.user_id == user.id).order_by(Assessment.created_at.desc(),Assessment.id.desc()).limit(limit).all()
    return AssessmentHistoryResponse(assessments=[AssessmentHistoryItem(id=r.id,current_role=r.current_role,target_role=r.target_role,experience_years=r.experience_years,readiness_score=r.readiness_score,created_at=r.created_at) for r in records])
