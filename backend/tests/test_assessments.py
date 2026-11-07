import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture()
def client():
    Base.metadata.create_all(bind=TEST_ENGINE)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=TEST_ENGINE)


def test_create_assessment_persists_and_returns_analysis(client):
    response = client.post(
        "/api/assessments",
        json={
            "current_role": "Student",
            "target_role": "Frontend Developer",
            "experience_years": 0,
            "skills": ["html", "css", "javascript", "git"],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["readiness_score"] == 23
    assert "React" in [gap["skill"] for gap in data["skill_gaps"]]


def test_assessment_history_returns_saved_assessments(client):
    client.post(
        "/api/assessments",
        json={
            "current_role": "Student",
            "target_role": "Data Analyst",
            "experience_years": 0,
            "skills": ["python", "sql"],
        },
    )
    response = client.get("/api/assessments")
    assert response.status_code == 200
    assert len(response.json()["assessments"]) == 1
    assert response.json()["assessments"][0]["target_role"] == "Data Analyst"


def test_unknown_target_role_is_rejected(client):
    response = client.post(
        "/api/assessments",
        json={
            "current_role": "Student",
            "target_role": "Astronaut",
            "experience_years": 0,
            "skills": [],
        },
    )
    assert response.status_code == 422



def test_assessment_readiness_uses_reported_proficiency(client):
    response = client.post(
        "/api/careers/analyze",
        json={
            "current_role": "Student",
            "target_role": "Frontend Developer",
            "experience_years": 0,
            "skills": ["html", "css", "javascript"],
            "skill_proficiencies": {
                "HTML": "Advanced",
                "CSS": "Intermediate",
                "JavaScript": "Beginner",
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["readiness_score"] == 34
