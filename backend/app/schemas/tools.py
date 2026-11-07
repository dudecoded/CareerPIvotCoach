from pydantic import BaseModel, Field


class ResumeReviewRequest(BaseModel):
    resume_text: str = Field(min_length=80, max_length=20000)
    target_role: str = Field(min_length=1, max_length=120)


class ResumeReviewResponse(BaseModel):
    target_role: str
    detected_skills: list[str]
    missing_keywords: list[str]
    strengths: list[str]
    improvements: list[str]
    summary: str


class InterviewPrepRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)
    skills: list[str] = Field(default_factory=list, max_length=100)
    experience_level: str = Field(default="Beginner", max_length=40)


class InterviewQuestion(BaseModel):
    category: str
    question: str
    what_to_cover: str


class InterviewPrepResponse(BaseModel):
    target_role: str
    questions: list[InterviewQuestion]
    preparation_tip: str
