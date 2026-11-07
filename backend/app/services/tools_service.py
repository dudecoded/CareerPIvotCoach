import re

from app.schemas.tools import (
    InterviewPrepRequest,
    InterviewPrepResponse,
    InterviewQuestion,
    ResumeReviewRequest,
    ResumeReviewResponse,
)
from app.services.career_service import CAREER_SKILLS


def review_resume(payload: ResumeReviewRequest) -> ResumeReviewResponse:
    role_skills = CAREER_SKILLS.get(payload.target_role)
    if role_skills is None:
        raise ValueError(f"Unsupported target role: {payload.target_role}")
    text = payload.resume_text.casefold()
    detected = [skill for skill in role_skills if re.search(r"(?<![a-z0-9])" + re.escape(skill.casefold()) + r"(?![a-z0-9])", text)]
    missing = [skill for skill in role_skills if skill not in detected]
    strengths = []
    if len(detected) >= 3:
        strengths.append("Your resume mentions several skills relevant to the target role.")
    if re.search(r"\b(built|developed|created|implemented|designed|analysed|analyzed|deployed)\b", text):
        strengths.append("It includes action-oriented language that can communicate ownership.")
    if re.search(r"\b(%, percent|increased|reduced|improved|saved|users|customers)\b", text):
        strengths.append("It appears to include outcome-oriented language or measurable impact.")
    if not strengths:
        strengths.append("The resume text is readable enough for a first-pass keyword review.")
    improvements = []
    if missing:
        improvements.append("Where truthful, add evidence for relevant skills: " + ", ".join(missing[:5]) + ".")
    if not re.search(r"\b(built|developed|created|implemented|designed|analysed|analyzed|deployed)\b", text):
        improvements.append("Rewrite responsibilities as action-led achievement bullets that explain what you did.")
    if not re.search(r"\b(\d+%|\d+ users|\d+ customers|\d+ projects|\d+ hours)\b", text):
        improvements.append("Add honest numbers or outcomes where available; never invent metrics.")
    improvements.append("Tailor the summary and strongest project to the selected target role.")
    return ResumeReviewResponse(
        target_role=payload.target_role,
        detected_skills=detected,
        missing_keywords=missing,
        strengths=strengths,
        improvements=improvements,
        summary=f"First-pass keyword review: {len(detected)} of {len(role_skills)} mapped {payload.target_role} skills were found. This is guidance, not an ATS score or hiring prediction.",
    )


def build_interview_prep(payload: InterviewPrepRequest) -> InterviewPrepResponse:
    role_skills = CAREER_SKILLS.get(payload.target_role)
    if role_skills is None:
        raise ValueError(f"Unsupported target role: {payload.target_role}")
    selected = {skill.casefold() for skill in payload.skills}
    focus = [skill for skill in role_skills if skill.casefold() in selected]
    gaps = [skill for skill in role_skills if skill.casefold() not in selected]
    questions = [
        InterviewQuestion(category="Introduction", question=f"Tell me about yourself and why you are pursuing {payload.target_role}.", what_to_cover="Your background, motivation, relevant experience, and a concise career direction."),
        InterviewQuestion(category="Fundamentals", question=f"Explain a core concept in {role_skills[0]} and give a practical example.", what_to_cover=f"Define {role_skills[0]}, explain when it is useful, and describe a concrete example."),
        InterviewQuestion(category="Practical", question=f"Describe a project where you used {focus[0] if focus else role_skills[1]}. What was your contribution?", what_to_cover="Problem, your decisions, implementation, trade-offs, and outcome."),
        InterviewQuestion(category="Problem solving", question=f"How would you approach a task that requires {gaps[0] if gaps else role_skills[-1]}?", what_to_cover="Clarify requirements, break down the problem, validate assumptions, and test the result."),
        InterviewQuestion(category="Behavioural", question="Tell me about a time you struggled with a task or received critical feedback.", what_to_cover="Use the STAR structure: situation, task, action, result, and lesson learned."),
        InterviewQuestion(category="Growth", question="What are you currently learning, and how are you applying it?", what_to_cover="Be specific about practice, projects, feedback, and next steps."),
    ]
    return InterviewPrepResponse(
        target_role=payload.target_role,
        questions=questions,
        preparation_tip=f"Prepare concise examples for {', '.join(focus[:3]) if focus else role_skills[0]}. Be honest about gaps such as {', '.join(gaps[:2]) if gaps else 'advanced applications'} and explain how you are closing them.",
    )
