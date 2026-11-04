# CareerPivotCoach — Assessment Persistence

This implementation adds a first persistent assessment workflow using FastAPI,
SQLAlchemy and SQLite.

## What it adds

- `POST /api/assessments`: analyse a submitted profile and save the result.
- `GET /api/assessments`: retrieve the latest saved assessments.
- `POST /api/careers/analyze`: analyse a profile without saving it.
- SQLite `assessments` table, created automatically when the API starts.
- Validation for supported target roles and request fields.
- Tests for persistence, history retrieval and invalid roles.

The API response fields are compatible with the current frontend's
`saveAssessment()` response type.

## Install and run (Windows PowerShell)

From the repository root:

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to try the endpoints.

## Run tests

From the `backend` directory:

```powershell
python -m pytest -q
```

## Database

The database file is created at:

```text
backend/career_pivot_coach.db
```

Do not commit this generated database file. Add this to `backend/.gitignore`
if it is not already present:

```gitignore
*.db
__pycache__/
.pytest_cache/
.venv/
```

## API examples

Create and save an assessment:

```json
{
  "current_role": "Student",
  "target_role": "Frontend Developer",
  "experience_years": 0,
  "skills": ["html", "css", "javascript", "git"]
}
```

Get recent history:

```text
GET /api/assessments?limit=20
```

## Important implementation notes

- This is a deterministic skill-overlap baseline, not an AI model.
- The score is skill coverage, not a prediction of job readiness.
- Assessment records are currently shared by the application; user accounts
  and per-user access controls are a separate milestone.
- `create_all()` is suitable for this initial SQLite milestone. Use database
  migrations (for example Alembic) before evolving a production schema.
