import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.main import app
TEST_ENGINE = create_engine("sqlite://",connect_args={"check_same_thread":False},poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False,autoflush=False,bind=TEST_ENGINE)
@pytest.fixture()
def client():
    Base.metadata.create_all(bind=TEST_ENGINE)
    def override_get_db():
        db=TestingSessionLocal()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db]=override_get_db
    with TestClient(app) as c: yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=TEST_ENGINE)
def register(client,email="learner@example.com"):
    response=client.post("/api/auth/register",json={"name":"Learner","email":email,"password":"strong-password-123"})
    assert response.status_code==201
    return {"Authorization":"Bearer "+response.json()["access_token"]}
def test_register_and_login(client):
    register(client)
    response=client.post("/api/auth/login",json={"email":"learner@example.com","password":"strong-password-123"})
    assert response.status_code==200
    assert response.json()["user"]["email"]=="learner@example.com"
def test_create_assessment_persists_and_returns_analysis(client):
    headers=register(client)
    response=client.post("/api/assessments",headers=headers,json={"current_role":"Student","target_role":"Frontend Developer","experience_years":0,"skills":["html","css","javascript","git"]})
    assert response.status_code==201
    data=response.json()
    assert data["id"] is not None
    assert data["readiness_score"]==23
    assert "React" in [gap["skill"] for gap in data["skill_gaps"]]
def test_assessment_history_is_private_per_user(client):
    first=register(client,"one@example.com")
    second=register(client,"two@example.com")
    client.post("/api/assessments",headers=first,json={"current_role":"Student","target_role":"Data Analyst","experience_years":0,"skills":["python","sql"]})
    assert len(client.get("/api/assessments",headers=first).json()["assessments"])==1
    assert len(client.get("/api/assessments",headers=second).json()["assessments"])==0
def test_assessment_requires_authentication(client):
    response=client.get("/api/assessments")
    assert response.status_code==401
def test_unknown_target_role_is_rejected(client):
    headers=register(client)
    response=client.post("/api/assessments",headers=headers,json={"current_role":"Student","target_role":"Astronaut","experience_years":0,"skills":[]})
    assert response.status_code==422
def test_assessment_readiness_uses_reported_proficiency(client):
    response=client.post("/api/careers/analyze",json={"current_role":"Student","target_role":"Frontend Developer","experience_years":0,"skills":["html","css","javascript"],"skill_proficiencies":{"HTML":"Advanced","CSS":"Intermediate","JavaScript":"Beginner"}})
    assert response.status_code==200
    assert response.json()["readiness_score"]==34
def test_profile_is_saved_to_authenticated_user(client):
    headers=register(client)
    response=client.put("/api/profile",headers=headers,json={"education":"B.Tech","target_domain":"ML Engineer","hours_per_week":8})
    assert response.status_code==200
    assert response.json()["profile"]["target_domain"]=="ML Engineer"
