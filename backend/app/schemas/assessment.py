from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AssessmentCreate(BaseModel):
    current_role: str = Field(min_length=1, max_length=120)
    target_role: str = Field(min_length=1, max_length=120)
    experience_years: float = Field(default=0, ge=0, le=60)
    skills: list[str] = Field(default_factory=list, max_length=100)
    skill_proficiencies: dict[str, str] = Field(default_factory=dict)


class SkillGap(BaseModel):
    skill: str
    importance: int
    priority: str


class RoadmapTask(BaseModel):
    task: str
    completed: bool = False


class RoadmapPhase(BaseModel):
    period: str
    title: str
    tasks: list[RoadmapTask]


class AssessmentResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    current_role: str
    target_role: str
    experience_years: float
    readiness_score: int
    matched_skills: list[str]
    skill_gaps: list[SkillGap]
    recommendation: str
    roadmap: list[RoadmapPhase]
    score_note: str
    created_at: datetime | None = None


class AssessmentHistoryItem(BaseModel):
    id: int
    current_role: str
    target_role: str
    experience_years: float
    readiness_score: int
    created_at: datetime


class AssessmentHistoryResponse(BaseModel):
    assessments: list[AssessmentHistoryItem]
