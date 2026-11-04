from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, JSON
from app.db.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    current_role = Column(String(120), nullable=False)
    target_role = Column(String(120), nullable=False, index=True)
    experience_years = Column(Float, nullable=False, default=0)
    skills = Column(JSON, nullable=False, default=list)
    readiness_score = Column(Integer, nullable=False)
    matched_skills = Column(JSON, nullable=False, default=list)
    skill_gaps = Column(JSON, nullable=False, default=list)
    recommendation = Column(String(1000), nullable=False)
    roadmap = Column(JSON, nullable=False, default=list)
    score_note = Column(String(500), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
