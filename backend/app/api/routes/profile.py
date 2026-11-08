from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.routes.auth import current_user
from app.db.database import get_db
from app.models.user import User
router = APIRouter(prefix="/api/profile", tags=["profile"])
class ProfileUpdate(BaseModel):
    education: str = Field(default="", max_length=160)
    current_role: str = Field(default="Student", max_length=120)
    target_domain: str = Field(default="Frontend Developer", max_length=120)
    experience_level: str = Field(default="Beginner", max_length=40)
    interests: list[str] = Field(default_factory=list, max_length=30)
    goals: list[str] = Field(default_factory=list, max_length=20)
    learning_style: str = Field(default="Project-based", max_length=60)
    hours_per_week: int = Field(default=5, ge=1, le=80)
    skills: list[str] = Field(default_factory=list, max_length=100)
@router.get("")
def get_profile(user: User = Depends(current_user)):
    return {"name":user.name,"email":user.email,"profile":user.profile or {}}
@router.put("")
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.profile = payload.model_dump(); db.commit(); db.refresh(user)
    return {"name":user.name,"email":user.email,"profile":user.profile}
