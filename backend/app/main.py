from sqlalchemy import inspect, text
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.assessments import router as assessments_router
from app.api.routes.careers import router as careers_router
from app.api.routes.coach import router as coach_router
from app.api.routes.tools import router as tools_router
from app.api.routes.interview import router as interview_router
from app.api.routes.auth import router as auth_router
from app.api.routes.profile import router as profile_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.learning import router as learning_router
from app.db.database import Base, engine
from app.models.assessment import Assessment  # noqa: F401
from app.models.user import User  # noqa: F401
Base.metadata.create_all(bind=engine)
# Lightweight SQLite migration for databases created before account ownership existed.
with engine.begin() as connection:
    columns = [column["name"] for column in inspect(engine).get_columns("assessments")]
    if "user_id" not in columns:
        connection.execute(text("ALTER TABLE assessments ADD COLUMN user_id INTEGER REFERENCES users(id)"))
app = FastAPI(title="CareerPivotCoach API",description="Personalised career transition planning and assessment API",version="1.3.0")
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:5174","http://127.0.0.1:5174"],allow_credentials=True,allow_methods=["GET","POST","PUT","OPTIONS"],allow_headers=["Content-Type","Authorization"])
for router in (auth_router,profile_router,analytics_router,learning_router,assessments_router,careers_router,coach_router,tools_router,interview_router): app.include_router(router)
@app.get("/")
def root(): return {"message":"Welcome to CareerPivotCoach API","status":"running"}
@app.get("/api/health")
def health(): return {"status":"healthy"}
