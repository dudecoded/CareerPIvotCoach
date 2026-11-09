from typing import Literal

from pydantic import BaseModel, Field


class CoachMessage(BaseModel):
    role: Literal["user", "coach"]
    content: str = Field(min_length=1, max_length=4000)


class CoachChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    current_role: str = Field(default="Student", max_length=120)
    target_role: str = Field(min_length=1, max_length=120)
    experience_years: float = Field(default=0, ge=0, le=60)
    skills: list[str] = Field(default_factory=list, max_length=100)
    goal: str = Field(default="Become job-ready", max_length=300)
    history: list[CoachMessage] = Field(default_factory=list, max_length=20)


class CoachChatResponse(BaseModel):
    reply: str
    mode: Literal["offline"] = "offline"
