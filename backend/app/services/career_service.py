from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentResult,
    RoadmapPhase,
    RoadmapTask,
    SkillGap,
)

# Keep these labels aligned with the career options in frontend/src/App.tsx.
CAREER_SKILLS: dict[str, list[str]] = {
    "Data Analyst": [
        "Excel", "SQL", "Python", "Statistics", "Data visualization", "Communication"
    ],
    "Frontend Developer": [
        "HTML", "CSS", "JavaScript", "React", "Git", "Responsive design"
    ],
    "Backend Developer": [
        "Python", "APIs", "SQL", "Git", "Authentication", "Testing"
    ],
    "ML Engineer": [
        "Python", "Statistics", "Pandas", "Scikit-learn", "Model evaluation", "APIs"
    ],
    "Machine Learning Engineer": [
        "Python", "Statistics", "Pandas", "Scikit-learn", "Model evaluation", "APIs"
    ],
    "Product Manager": [
        "Communication", "User research", "Prioritization", "Analytics",
        "Roadmapping", "Stakeholder management"
    ],
    "UI/UX Designer": [
        "Figma", "User research", "Wireframing", "Prototyping",
        "Visual design", "Usability testing"
    ],
}


def analyze_career(payload: AssessmentCreate) -> AssessmentResult:
    target_skills = CAREER_SKILLS.get(payload.target_role)
    if target_skills is None:
        # Unknown targets should not silently receive a misleading score.
        raise ValueError(
            f"Unsupported target role '{payload.target_role}'. "
            f"Choose one of: {', '.join(CAREER_SKILLS.keys())}."
        )

    selected = {skill.strip().casefold() for skill in payload.skills if skill.strip()}
    matched = [skill for skill in target_skills if skill.casefold() in selected]
    missing = [skill for skill in target_skills if skill.casefold() not in selected]
    score = round((len(matched) / len(target_skills)) * 100) if target_skills else 0

    gaps = [
        SkillGap(
            skill=skill,
            importance=max(1, 5 - index // 2),
            priority="High" if index < 2 else ("Medium" if index < 4 else "Low"),
        )
        for index, skill in enumerate(missing)
    ]

    roadmap = [
        RoadmapPhase(
            period="Days 1–30",
            title="Build your foundations",
            tasks=[
                RoadmapTask(task=f"Learn and practise {skill}")
                for skill in missing[:2]
            ] or [RoadmapTask(task="Refresh the fundamentals for your target role")],
        ),
        RoadmapPhase(
            period="Days 31–60",
            title="Create a portfolio project",
            tasks=[
                RoadmapTask(task=f"Use {skill} in a practical project")
                for skill in (missing[2:4] or matched[:2])
            ] or [RoadmapTask(task="Build a project that demonstrates your current skills")],
        ),
        RoadmapPhase(
            period="Days 61–90",
            title="Polish and prepare",
            tasks=[
                RoadmapTask(task="Document your project and publish it in your portfolio"),
                RoadmapTask(task="Practise explaining your decisions and prepare for interviews"),
            ],
        ),
    ]

    if score >= 80:
        recommendation = "You have strong skill overlap. Focus on portfolio evidence and interview practice."
    elif score >= 50:
        recommendation = "You have a useful foundation. Prioritise the highest-impact gaps and build a project."
    else:
        recommendation = "Start with the fundamentals, then build small projects to demonstrate steady progress."

    return AssessmentResult(
        current_role=payload.current_role.strip(),
        target_role=payload.target_role,
        experience_years=payload.experience_years,
        readiness_score=score,
        matched_skills=matched,
        skill_gaps=gaps,
        recommendation=recommendation,
        roadmap=roadmap,
        score_note=(
            "This is a skill-coverage estimate based only on the skills selected. "
            "It is not a prediction of employability or hiring outcomes."
        ),
    )
