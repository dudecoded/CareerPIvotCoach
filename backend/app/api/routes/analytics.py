from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.routes.auth import current_user
from app.db.database import get_db
from app.models.assessment import Assessment
from app.models.user import User
router = APIRouter(prefix="/api/analytics", tags=["analytics"])
@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.query(Assessment).filter(Assessment.user_id == user.id).order_by(Assessment.created_at.asc()).all()
    return {"assessment_count":len(rows),"readiness_history":[{"date":r.created_at.isoformat(),"score":r.readiness_score,"target_role":r.target_role} for r in rows],"latest":rows[-1].readiness_score if rows else None,"matched_skill_counts":[{"date":r.created_at.isoformat(),"count":len(r.matched_skills or [])} for r in rows]}
