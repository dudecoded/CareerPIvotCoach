# Google Sign-In setup (local development)

CareerPivotCoach uses Google Identity Services (GIS) in the browser. The frontend receives a Google ID token and sends it to the FastAPI endpoint, which verifies the token with Google's public verification flow.

## 1. Configure Google Cloud

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen / Google Auth Platform.
3. Create an OAuth client ID with application type **Web application**.
4. Add the Vite development origins under **Authorized JavaScript origins**:
   - `http://localhost:5174`
   - `http://127.0.0.1:5174`
5. If the consent screen is in Testing mode, add the Google account used for testing to the test-user list.

This implementation uses the GIS ID-token credential callback. It does not use an authorization-code redirect flow, so an OAuth client secret or redirect URI is not required for this local sign-in flow. Never put a client secret in frontend code or commit it to the repository.

## 2. Configure the frontend

Create `frontend/.env.local` (do not commit this local file):

```env
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id
```

Restart the Vite dev server after changing environment variables.

## 3. Configure the backend

In the same PowerShell terminal used to start Uvicorn, set the matching client ID:

```powershell
$env:GOOGLE_CLIENT_ID="your-google-web-client-id"
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The backend verifies the ID token against this client ID. The frontend and backend must use the same OAuth client ID.

## 4. Run and test

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open the Vite URL, choose Google sign-in, and select an account authorised for the consent screen. A successful browser sign-in sends a real ID token to `POST /api/auth/google`.

Do not test this endpoint in Swagger with a placeholder such as `stringstringstringst`: that is not a signed Google ID token and should return `401 Unauthorized`.

## Troubleshooting

- **Google button is missing:** confirm `frontend/.env.local` exists and contains `VITE_GOOGLE_CLIENT_ID`, then restart Vite.
- **Google says the app is not available:** add the account as a test user while the consent screen is in Testing mode.
- **Backend reports Google sign-in is not configured:** set `GOOGLE_CLIENT_ID` in the terminal that launches Uvicorn.
- **Backend cannot import the Google requests transport:** install the `requests` package in the active backend virtual environment (`python -m pip install requests`). Keep backend dependencies in `backend/requirements.txt` in sync when changing authentication dependencies.
- **401 from `/api/auth/google`:** use the credential returned by the real GIS browser callback, and verify that the client ID matches on both frontend and backend.

Google sign-in has not been fully validated until a real browser sign-in completes successfully. Local development settings are not a production deployment configuration.
