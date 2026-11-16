# CareerPivotCoach — Architecture Notes

**Status:** Living document · **Last updated:** 10 November 2026

## 1. System at a glance

CareerPivotCoach is a browser-based career-planning application with a React frontend and a FastAPI backend.

```text
┌─────────────────────────────────────────────┐
│                  Browser                    │
│                                             │
│  React + TypeScript + Vite                  │
│  Career assessment · Skill gaps · Roadmap  │
│  Interview practice · Local UI state       │
└──────────────────────┬──────────────────────┘
                       │ HTTP / JSON
                       ▼
┌─────────────────────────────────────────────┐
│                FastAPI                       │
│  API routes · Request validation             │
│  Application services · Error responses      │
└──────────────────────┬──────────────────────┘
                       │ SQLAlchemy
                       ▼
┌─────────────────────────────────────────────┐
│                SQLite                        │
│  Local development persistence               │
└─────────────────────────────────────────────┘
```

This is the intended logical flow. Exact endpoint coverage and persistence for each feature should be verified against the active implementation before relying on it.

## 2. Frontend responsibilities

The frontend lives in `frontend/src/`.

- `App.tsx` coordinates the main application experience and feature state.
- `VoiceInterview.tsx` contains the voice-interview practice experience.
- `api.ts` centralizes frontend communication with backend endpoints.
- `index.css` contains application-wide styling.
- `main.tsx` is the React application entry point.

The frontend is responsible for collecting user inputs, presenting assessment results, displaying skill gaps and learning steps, and providing feedback when API requests fail.

Browser local storage may be used for supported client-side preferences or progress. It should not be treated as a secure store for secrets or sensitive authentication tokens.

## 3. Backend responsibilities

The backend lives in `backend/app/` and uses FastAPI.

- `main.py` creates the application and registers top-level configuration.
- `api/` contains HTTP route modules.
- `schemas/` defines request and response validation models.
- `models/` contains database model definitions.
- `db/` contains database setup and session-related code.
- `services/` holds application logic that should remain separate from HTTP route handlers.
- `core/` holds shared configuration and cross-cutting concerns.

Routes should validate input, call the relevant service, and return a predictable response. Business rules should not be duplicated across route handlers.

## 4. Main data flow

A typical career assessment follows this sequence:

1. The user selects a target role and provides experience and existing skills.
2. The frontend validates required fields and sends a JSON request through `api.ts`.
3. FastAPI validates the payload using the relevant schema.
4. A service evaluates skill overlap, missing skills, and readiness.
5. The API returns a structured result.
6. The frontend renders the score, matched skills, gaps, and recommended next steps.

A readiness score is a planning aid based on the application's scoring logic. It is not a probability of getting hired or a guarantee of career success.

## 5. Persistence boundaries

- **SQLite / SQLAlchemy:** intended for backend-managed application records in local development.
- **Browser local storage:** suitable for non-sensitive client-side state and convenience.
- **Environment variables:** required for configuration that differs by environment, including API credentials.

Do not store API keys, OAuth client secrets, or private credentials in frontend code, committed files, or browser local storage. Public OAuth client identifiers are not secrets, but allowed origins and backend token verification still need to be configured correctly.

## 6. AI integration boundary

AI-generated coaching should be isolated behind a backend service rather than called directly from browser code with a private provider key.

The service boundary should make it possible to:
- build a prompt from validated career context;
- call the configured provider from the server;
- handle timeouts, provider errors, and rate limits;
- validate and normalize the response before returning it;
- clearly label fallback or demo responses.

Do not describe a feature as AI-powered when it is currently using static or predefined responses.

## 7. Engineering principles

1. Keep HTTP routing, business logic, and persistence concerns separate.
2. Validate external input at API boundaries.
3. Keep secrets on the server and out of Git.
4. Return useful, consistent errors without exposing stack traces or credentials.
5. Make scoring logic deterministic and testable.
6. Test backend services and API routes independently of the UI.
7. Treat browser storage as untrusted input.
8. Update this document when the real implementation or data flow changes.

## 8. Verification checklist

Before shipping a change, verify the relevant parts rather than assuming the whole system works:

- Frontend: `npm run build` and `npm run lint` from `frontend/`.
- Backend: run the test suite from `backend/` using the project's configured test command.
- API: exercise changed endpoints through automated tests or the local OpenAPI page at `/docs`.
- Integration: confirm frontend request and backend response shapes agree.
- Security: check that no secrets, local databases, virtual environments, or build artifacts are staged.
