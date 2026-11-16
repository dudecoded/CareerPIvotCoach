# Live AI coach and community journal

## Live AI career coach

The coach now supports any OpenAI-compatible Chat Completions API. The backend remains usable without a provider key and falls back to clearly labelled local career guidance.

Configure these environment variables in the same PowerShell terminal used to start FastAPI:

```powershell
$env:AI_API_KEY="YOUR_PROVIDER_API_KEY"
$env:AI_BASE_URL="https://api.openai.com/v1"
$env:AI_MODEL="gpt-4o-mini"
uvicorn app.main:app --reload
```

Use the provider's own API base URL and model name if you use a compatible provider. Keep API keys on the backend only. Never put them in `frontend/.env.local`, React code, or Git.

When configured and reachable, the coach sends the learner's current role, target role, experience, skills, goal, and recent conversation to the model. The UI labels responses LIVE AI. Without a configured key or if the provider is unavailable, it uses the local fallback and labels it OFFLINE.

## Community blog / saved posts

The Blog workspace requires a signed-in account. It uses the same SQLite database configured by `backend/app/db/database.py`.

Tables:
- `posts`: authored field notes and optional source links.
- `post_likes`: one like per user per post.
- `post_bookmarks`: saved posts, unique per user and post.
- `post_comments`: discussion attached to posts.

The API exposes:
- `GET /api/posts` — latest community posts.
- `GET /api/posts?saved=true` — the signed-in user's reading list.
- `POST /api/posts` — publish a field note.
- `POST /api/posts/{id}/like` — toggle a like.
- `POST /api/posts/{id}/save` — toggle a bookmark.
- `GET /api/posts/{id}/comments` and `POST /api/posts/{id}/comments`.

All routes require the existing bearer-token authentication. Post ownership and saved-post relationships are stored in the database, not browser local storage.

## Apply locally

Pull the feature branch, restart FastAPI so SQLAlchemy creates the new tables, then refresh Vite. Existing SQLite data is preserved; `create_all` creates the new tables without dropping existing tables.
