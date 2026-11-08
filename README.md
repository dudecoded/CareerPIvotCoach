# CareerPivotCoach

CareerPivotCoach helps students and early-career professionals plan a transition into a target career. It combines a skills assessment, proficiency-weighted readiness estimate, gap analysis, a 90-day starter roadmap, progress tracking, an offline career coach, resume keyword review, and interview practice.

> **Status:** Active development. The current application is a local-first MVP. It does not yet include user authentication, cloud account sync, or a live LLM integration.

## Features

- **Career assessment:** choose a target role, record current skills, and rate each skill as Beginner, Intermediate, or Advanced.
- **Weighted readiness estimate:** Beginner = 0.35, Intermediate = 0.70, Advanced = 1.0. The score is a planning signal, not a prediction of employability.
- **Skill gap analysis:** compare selected skills with the target-role skill map.
- **90-day roadmap:** review milestones and mark progress. Frontend preferences and task progress persist in browser local storage.
- **Assessment history:** view saved assessments in the local SQLite database.
- **Offline career coach:** context-aware guidance for learning plans, projects, skill gaps, and internship preparation. No API key required.
- **Resume review:** paste resume text for a first-pass target-role keyword and writing review. The text is processed by the local backend and is not persisted.
- **Interview preparation:** generate role-specific practice questions and answer guidance.
- **AI Interview Studio (vision beta):** use a webcam preview with MediaPipe face and hand landmarks in the browser, plus periodic OpenCV face/eye-region and lighting checks through the local FastAPI backend. The current stage is camera setup and visual feedback; voice interviewing and answer evaluation are planned next.

The resume review and offline coach are rule-based features. They are not an ATS, a substitute for human career advice, or a live generative AI model.

## Tech stack

- Frontend: React 19, TypeScript, Vite, custom CSS
- Backend: Python, FastAPI, Pydantic, SQLAlchemy
- Database: SQLite for local development
- Computer vision: OpenCV (backend), MediaPipe Tasks Vision (browser)
- Tests: pytest, FastAPI TestClient

## Repository structure

```text
CareerPIvotCoach/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── InterviewStudio.tsx
│   │   └── index.css
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── db/
│   │   └── models/
│   ├── tests/
│   └── requirements.txt
└── README.md
```

## Run locally (Windows PowerShell)

Open two terminals from the repository root.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal, usually http://localhost:5173.

Optional: set `VITE_API_BASE_URL` in a frontend `.env.local` if the API is hosted somewhere other than http://127.0.0.1:8000.

## Run checks

Backend, from `backend/` with the virtual environment activated:

```powershell
python -m pytest
```

Frontend, from `frontend/`:

```powershell
npm run lint
npm run build
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/careers/analyze` | Analyse a career profile without saving |
| POST | `/api/assessments` | Analyse and save an assessment |
| GET | `/api/assessments` | List recent saved assessments |
| POST | `/api/coach/chat` | Offline contextual career coach |
| POST | `/api/tools/resume-review` | First-pass resume review |
| POST | `/api/tools/interview-prep` | Interview practice questions |
| POST | `/api/interview/analyze-frame` | Ephemeral OpenCV webcam frame analysis |

## Current limitations and next steps

- Assessments are stored locally without user accounts or ownership boundaries. Do not expose this API publicly as a multi-user service until authentication and per-user authorization are implemented.
- Browser local storage is device/browser-specific and is not a cloud backup.
- The coach and career tools are deterministic/rule-based. A provider adapter and server-side secret management can be added later for live AI.
- AI Interview Studio currently implements camera and visual landmark checks only. It does not determine dishonesty, intent, emotion, confidence, or candidate suitability. Eye-gaze estimates are approximate and affected by glasses, lighting, camera position, and model performance.
- MediaPipe model assets are loaded by the browser from Google's model hosting/CDN on first use. The browser needs internet access for this initial download.
- Face and hand landmark processing runs in the browser. Small periodic camera snapshots are sent to the local backend for OpenCV checks; the endpoint does not save images. The feature is opt-in and requires camera permission. Voice interviewing, transcription, and answer scoring are not implemented yet.
- Career skill maps are starter maps and should be reviewed with current job descriptions and domain experts.
- Production deployment should use PostgreSQL, migrations, environment-specific CORS, rate limits, monitoring, and security review.
