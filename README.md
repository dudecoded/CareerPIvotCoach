# CareerPivotCoach

CareerPivotCoach helps students and early-career professionals plan a transition into a target career. It brings together career assessment, skill-gap analysis, a 90-day starter roadmap, progress tracking, an offline career coach, resume keyword review, and interview practice.

> **Project status:** Active development. The feature branch includes email/password accounts, optional Google sign-in, account-owned assessment history, profile onboarding, domain learning guides, and per-account analytics. The application is suitable for local development and evaluation, but it is **not yet hardened for public production deployment**.

## Features

- **Career assessment:** Choose a target role, record current skills, and rate each skill as Beginner, Intermediate, or Advanced.
- **Weighted readiness estimate:** Beginner = 0.35, Intermediate = 0.70, Advanced = 1.0. This is a planning signal, not a prediction of employability.
- **Skill-gap analysis:** Compare selected skills with the target-role skill map and identify areas to work on.
- **90-day roadmap:** Review milestones and track progress. Roadmap preferences and task progress are stored in browser local storage.
- **Accounts and profiles:** Register and sign in with email/password. The backend also provides an optional Google sign-in endpoint that requires server-side Google OAuth configuration.
- **Assessment history and analytics:** Save assessments to the account and view account-scoped history and readiness trends.
- **Profile onboarding:** Save education, current role, target domain, interests, goals, learning preference, and weekly study availability.
- **Domain learning guides:** Explore starter topics, portfolio projects, and practice prompts for supported career domains.
- **Offline career coach:** Get context-aware guidance for learning plans, projects, skill gaps, and internship preparation. No AI provider API key is required.
- **Resume review:** Paste resume text for a first-pass target-role keyword and writing review. The review is processed by the backend and is not persisted by this endpoint.
- **Interview preparation:** Generate role-specific practice questions and answer guidance.
- **AI Interview Studio:** Browser-based webcam preview with MediaPipe face and hand landmarks, plus periodic OpenCV checks through the FastAPI backend.
- **Fullscreen voice mock interviews:** Practice with role-based question banks, spoken question playback, browser speech-to-text, editable transcripts, timed sessions, and heuristic practice feedback.

The offline coach, resume review, and interview feedback are rule-based features. They are not a live generative AI model, an applicant tracking system (ATS), or a substitute for human career advice.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** SQLite by default for local development
- **Computer vision:** OpenCV (backend), MediaPipe Tasks Vision (browser)
- **Testing:** pytest, FastAPI TestClient, ESLint, TypeScript, Vite build

## Repository structure

```text
CareerPIvotCoach/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── InterviewStudio.tsx
│   │   ├── VoiceInterview.tsx
│   │   └── index.css
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   └── requirements.txt
├── docs/
└── README.md
```

## Getting started

### Prerequisites

- Python 3.13
- Node.js 22 and npm
- Git

### 1. Clone the repository

```powershell
git clone https://github.com/dudecoded/CareerPIvotCoach.git
cd CareerPIvotCoach
```

### 2. Start the backend

Open a terminal at the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000. Interactive API documentation is available at http://127.0.0.1:8000/docs.

### 3. Start the frontend

Open a second terminal at the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal, usually http://localhost:5173.

The frontend uses http://127.0.0.1:8000 as its default API base. To use a different backend URL, create `frontend/.env.local` and set:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the Vite development server after changing environment variables.

## Configuration and security

### Application signing secret

The backend currently has a development fallback for `CPC_SECRET_KEY`. **Do not use that fallback in a deployed environment.** Set a long, random, private value before starting the backend.

PowerShell example:

```powershell
$env:CPC_SECRET_KEY = "replace-with-a-long-random-secret"
uvicorn app.main:app --reload
```

Use your hosting provider's secret/environment-variable manager in deployment. Never commit real secrets to Git.

### Optional Google sign-in

The backend Google sign-in endpoint requires a Google OAuth client ID. Configure `GOOGLE_CLIENT_ID` on the backend and the matching client ID in the frontend's Google sign-in configuration. See [docs/google-signin-setup.md](docs/google-signin-setup.md) for setup details. Google sign-in is not configured automatically by the local setup. GitHub OAuth is not currently provided.

### Current security and deployment limitations

- Access tokens currently last seven days. There is no refresh-token or server-side token-revocation flow.
- Add rate limiting, HTTPS, monitoring, backups, and a security review before exposing the application publicly.
- Assessment history and analytics are scoped to the authenticated account. Other features, including coach conversations, resume reviews, and interview practice, are not all persisted as account-owned records.
- The default database is SQLite. The current database configuration is local-development oriented; PostgreSQL support, production migrations, and deployment database configuration still need to be implemented and tested.
- CORS currently allows local development origins. Configure allowed production frontend origins before deployment.
- The backend currently creates tables at application startup and includes a lightweight SQLite migration for assessment ownership. Use a proper migration system before production database changes.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Sign in with email and password |
| POST | `/api/auth/google` | Sign in with a Google ID token (requires configuration) |
| GET | `/api/auth/me` | Get the authenticated account |
| GET / PUT | `/api/profile` | Read or update the authenticated user's profile |
| GET | `/api/analytics/summary` | Get account-scoped assessment analytics |
| GET | `/api/learning/{domain}` | Get a domain learning guide |
| POST | `/api/careers/skill-match` | Experimental skill similarity suggestions |
| POST | `/api/careers/analyze` | Analyse a career profile without saving |
| POST | `/api/assessments` | Analyse and save an assessment |
| GET | `/api/assessments` | List the authenticated user's saved assessments |
| POST | `/api/coach/chat` | Get offline contextual career guidance |
| POST | `/api/tools/resume-review` | Run a first-pass resume review |
| POST | `/api/tools/interview-prep` | Generate interview practice questions |
| POST | `/api/interview/analyze-frame` | Run ephemeral OpenCV webcam-frame analysis |

For the complete request and response schemas, run the backend and open http://127.0.0.1:8000/docs.

## Running tests and checks

Run backend tests from the `backend/` directory with its virtual environment activated:

```powershell
python -m pytest
```

Run frontend checks from the `frontend/` directory:

```powershell
npm run lint
npm run build
```

The repository also has a GitHub Actions workflow that runs backend tests and frontend lint/build checks on pushes and pull requests.

## Privacy and feature limitations

- Browser local storage is specific to the browser and device; it is not a cloud backup.
- The resume review endpoint processes submitted text in the backend and does not persist that text.
- Interview Studio's visual signals are approximate. They do not determine dishonesty, intent, emotion, confidence, or candidate suitability. Results can be affected by glasses, lighting, camera position, and model performance.
- Face and hand landmark processing runs in the browser. Periodic camera snapshots are sent to the backend for OpenCV checks; the frame-analysis endpoint does not save those images. Camera access is opt-in and requires browser permission.
- Voice interviews use browser speech recognition and text-to-speech where supported (Chrome/Edge recommended). Availability and privacy behaviour vary by browser; speech recognition may be processed by the browser vendor. The app does not store audio recordings.
- Interview answer feedback is heuristic and considers features such as answer length, signposting, and examples. It does not verify factual or technical correctness and is not an objective hiring score.
- Fullscreen is a focus requirement for the voice interview flow, not a proctoring or cheating-detection feature.
- MediaPipe model assets are loaded by the browser from Google's model hosting/CDN on first use, so internet access is needed for that initial download.
- Career skill maps are starter guides. Compare them with current job descriptions and advice from people working in the target field.

## Roadmap

Potential next steps include PostgreSQL support, managed schema migrations, production CORS configuration, stronger token lifecycle controls, rate limiting, monitoring, and a security review before public deployment.
