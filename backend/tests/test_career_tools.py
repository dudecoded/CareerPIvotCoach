from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_offline_coach_returns_contextual_guidance():
    response = client.post(
        "/api/coach/chat",
        json={
            "message": "What should I learn first?",
            "current_role": "Student",
            "target_role": "Frontend Developer",
            "experience_years": 0,
            "skills": ["html", "css"],
            "goal": "Get internship-ready",
            "history": [],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "offline"
    assert "JavaScript" in data["reply"] or "React" in data["reply"]


def test_resume_review_finds_role_skills_and_improvements():
    response = client.post(
        "/api/tools/resume-review",
        json={
            "target_role": "Frontend Developer",
            "resume_text": (
                "Student developer. Built a responsive portfolio using HTML, CSS, "
                "JavaScript, React and Git. Improved page loading for 20 users."
            ),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "React" in data["detected_skills"]
    assert data["improvements"]


def test_interview_prep_returns_six_role_specific_questions():
    response = client.post(
        "/api/tools/interview-prep",
        json={
            "target_role": "Data Analyst",
            "skills": ["SQL", "Python"],
            "experience_level": "Beginner",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["questions"]) == 6
    assert data["target_role"] == "Data Analyst"


def test_resume_review_rejects_unsupported_role():
    response = client.post(
        "/api/tools/resume-review",
        json={"target_role": "Astronaut", "resume_text": "x" * 100},
    )
    assert response.status_code == 422
