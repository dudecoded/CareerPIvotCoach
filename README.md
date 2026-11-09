# CareerPivotCoach

CareerPivotCoach helps students and early-career professionals plan a transition into a target career. It combines a skills assessment, proficiency-weighted readiness estimate, gap analysis, a 90-day starter roadmap, progress tracking, an offline career coach, resume keyword review, and interview practice.

> **Status:** Active development. Email/password accounts, account-owned assessment history, profile onboarding, domain learning guides and per-account analytics are now available on the feature branch. OAuth providers and production deployment hardening are not yet configured.

## Features

- **Career assessment:** choose a target role, record current skills, and rate each skill as Beginner, Intermediate, or Advanced.
- **Weighted readiness estimate:** Beginner = 0.35, Intermediate = 0.70, Advanced = 1.0. The score is a planning signal, not a prediction of employability.\n- **Experimental ML skill similarity:** an unsupervised TF-IDF character n-gram endpoint suggests related skill terms. Suggestions require user confirmation and are not automatically counted as proficiency.
- **Skill gap analysis:** compare selected skills with the target-role skill map.
- **90-day roadmap:** review milestones and mark progress. Frontend preferences and task progress persist in browser local storage.
- **Multi-user accounts:** email/password registration and login with password hashing and signed bearer tokens. Assessment records and analytics are scoped to the authenticated account.\n- **Personal profile:** save education, current role, target domain, interests, goals, learning preference and weekly study availability.\n- **Domain learning:** curated starter topics, portfolio projects and practice prompts for supported career domains.\n- **Assessment history and analytics:** view account-owned assessments and a readiness-over-time chart backed by SQLite.
- **Offline career coach:** context-aware guidance for learning plans, projects, skill gaps, and internship preparation. No API key required.
- **Resume review:** paste resume text for a first-pass target-role keyword and writing review. The text is processed by the local backend and is not persisted.
- **Interview preparation:** generate role-specific practice questions and answer guidance.
- **AI Interview Studio:** webcam preview with MediaPipe face and hand landmarks in the browser, plus periodic OpenCV face/eye-region and lighting checks through the local FastAPI backend.
- **Fullscreen voice mock interviews:** fullscreen is required to start or resume a session; role-based question banks, spoken question playback, browser speech-to-text, editable transcripts, timed sessions, and a practice summary with transparent heuristic feedback.

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
| GET | `/api/health` | Health check |\n| POST | `/api/auth/register` | Create an account |\n| POST | `/api/auth/login` | Sign in and receive an access token |\n| GET | `/api/auth/me` | Current authenticated account |\n| GET/PUT | `/api/profile` | Read or update personal profile |\n| GET | `/api/analytics/summary` | Account-owned progress analytics |\n| GET | `/api/learning/{domain}` | Domain learning guide |\n| POST | `/api/careers/skill-match` | Experimental TF-IDF skill similarity suggestions |
| POST | `/api/careers/analyze` | Analyse a career profile without saving |
| POST | `/api/assessments` | Analyse and save an assessment |
| GET | `/api/assessments` | List recent saved assessments |
| POST | `/api/coach/chat` | Offline contextual career coach |
| POST | `/api/tools/resume-review` | First-pass resume review |
| POST | `/api/tools/interview-prep` | Interview practice questions |
| POST | `/api/interview/analyze-frame` | Ephemeral OpenCV webcam frame analysis |

## Account and security setup\n\nSet a unique secret before running outside local development. In PowerShell, set `$env:CPC_SECRET_KEY` to a long random value before starting Uvicorn. The built-in token lasts seven days; there is no refresh-token or server-side revocation flow yet. Passwords are hashed with PBKDF2-HMAC-SHA256. Configure HTTPS, rate limiting, backups, secret management, database migrations and a security review before public deployment. Google/GitHub OAuth is not enabled. Existing pre-account assessments are retained as legacy rows and are not visible in any new user's history.\n\n## Current limitations and next steps

- The application now has basic email/password accounts and ownership filtering for assessment history. Other features (for example interview reports, resume review and coach conversations) are not yet persisted or user-scoped. Do not treat this as production-ready authentication.
- Browser local storage is device/browser-specific and is not a cloud backup.
- The coach and career tools are deterministic/rule-based. A provider adapter and server-side secret management can be added later for live AI.
- Interview Studio's visual signals are approximate and do not determine dishonesty, intent, emotion, confidence, or candidate suitability. Eye-gaze estimates are affected by glasses, lighting, camera position, and model performance.
- Voice interviews use the browser Web Speech API where supported (Chrome/Edge recommended). Speech recognition availability and privacy behaviour vary by browser and may rely on an online service. A manual transcript editor is provided as a fallback.
- Interview answer feedback is a transparent heuristic for answer length, signposting and examples. It does not grade factual or technical correctness, and must not be treated as an objective hiring score. Fullscreen is a focus requirement, not a proctoring or cheating-detection feature.
- MediaPipe model assets are loaded by the browser from Google's model hosting/CDN on first use. The browser needs internet access for this initial download.
- Face and hand landmark processing runs in the browser. Small periodic camera snapshots are sent to the local backend for OpenCV checks; the endpoint does not save images. The feature is opt-in and requires camera permission. Voice interview sessions use browser speech recognition and text-to-speech; no audio recording is stored by the app. Speech recognition may be processed by the browser vendor. The local practice summary uses heuristics only.
- Career skill maps are starter maps and should be reviewed with current job descriptions and domain experts.
- Production deployment should use PostgreSQL, migrations, environment-specific CORS, rate limits, monitoring, and security review.
