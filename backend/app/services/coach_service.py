import json
import os
import urllib.error
import urllib.request
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.career_service import CAREER_SKILLS

def _live_reply(payload: CoachChatRequest) -> str | None:
    """Call an OpenAI-compatible chat-completions endpoint when configured."""
    api_key = os.getenv("AI_API_KEY", "").strip()
    if not api_key:
        return None
    base_url = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("AI_MODEL", "gpt-4o-mini").strip()
    system = (
        "You are CareerPivot, a practical, encouraging career coach. "
        "Use the learner's role, target role, skills, goal and conversation history. "
        "Give specific, realistic next actions, explain trade-offs, ask a useful follow-up "
        "when needed, and never invent credentials, jobs, salaries or guarantees. "
        "Format concise answers with clear steps. Be supportive without empty motivation."
    )
    context = (
        f"Current role: {payload.current_role}\nTarget role: {payload.target_role}\n"
        f"Experience years: {payload.experience_years}\nSkills: {', '.join(payload.skills)}\n"
        f"Goal: {payload.goal}"
    )
    messages = [{"role": "system", "content": system}, {"role": "user", "content": "Learner context:\n" + context}]
    messages.extend({"role": item.role, "content": item.content} for item in payload.history[-12:])
    messages.append({"role": "user", "content": payload.message})
    body = json.dumps({"model": model, "messages": messages, "temperature": 0.65, "max_tokens": 700}).encode()
    request = urllib.request.Request(
        base_url + "/chat/completions", data=body,
        headers={"Authorization": "Bearer " + api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            result = json.loads(response.read().decode())
        return result["choices"][0]["message"]["content"].strip()
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError, TypeError):
        return None

def generate_coach_reply(payload: CoachChatRequest) -> CoachChatResponse:
    """Use a configured live model; retain useful local guidance as a fallback."""
    live = _live_reply(payload)
    if live:
        return CoachChatResponse(reply=live, mode="live")
    target = payload.target_role.strip()
    target_skills = CAREER_SKILLS.get(target)
    selected = {item.strip().casefold() for item in payload.skills if item.strip()}
    gaps = [skill for skill in (target_skills or []) if skill.casefold() not in selected]
    lower = payload.message.strip().casefold()
    if not target_skills:
        reply = f"I can help you plan a transition towards {target}. Choose a supported target role in your assessment for a more accurate skill-gap plan."
    elif any(word in lower for word in ("roadmap", "plan", "where do i start", "start")):
        first = gaps[:2] or target_skills[:2]
        reply = f"Your goal is {payload.goal}, moving from {payload.current_role} towards {target}. Start with {first[0]}" + (f" and {first[1]}" if len(first) > 1 else "") + ". Spend week one on fundamentals, week two on practical exercises, and week three building a small project. Review your progress at the end of each week."
    elif any(word in lower for word in ("project", "portfolio", "build")):
        first = gaps[0] if gaps else target_skills[0]
        reply = f"Build a project that demonstrates {target} skills rather than a tutorial clone. Start with a small real problem using {first}. Define the smallest useful version, write a clear README, add screenshots, and explain your decisions."
    elif any(word in lower for word in ("internship", "interview", "job", "resume", "cv")):
        reply = f"For a {target} opportunity, prepare evidence in three areas: fundamentals, a project you can explain end to end, and clear communication. Update your resume with measurable project outcomes and practise explaining one technical challenge you solved."
    elif any(word in lower for word in ("skill", "gap", "learn", "weak", "missing")):
        reply = ("Your main mapped skill gaps are " + ", ".join(gaps[:4]) + ". Pick one, learn the core concepts, and complete a small exercise that proves you can apply it.") if gaps else f"You have selected all mapped skills for {target}. Validate them with a project, practical exercise, or interview-style explanation."
    else:
        next_step = gaps[0] if gaps else "a portfolio project"
        reply = f"Given your goal of becoming a {target}, a practical next step is {next_step}. Keep the task small enough to finish in 30–45 minutes, then note what you understood and what you will practise next. Ask me about your roadmap, skill gaps, projects, resume, or interview preparation."
    reply += "\n\n*Offline coach mode:* set AI_API_KEY, AI_BASE_URL and AI_MODEL on the backend to enable live model responses."
    return CoachChatResponse(reply=reply, mode="offline")
