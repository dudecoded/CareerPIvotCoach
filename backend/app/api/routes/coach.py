from fastapi import APIRouter

from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.coach_service import generate_coach_reply

router = APIRouter(prefix="/api/coach", tags=["career coach"])


@router.post("/chat", response_model=CoachChatResponse)
def chat(payload: CoachChatRequest):
    return generate_coach_reply(payload)
