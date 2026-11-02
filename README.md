# Career Pivot Coach 🚀

**Turn your existing skills into your next career.**

Career Pivot Coach is an AI-powered career guidance platform designed to help students and early-career developers explore new career paths, identify skill gaps, evaluate their readiness, and build personalized learning roadmaps.

Instead of wondering what to learn next, users can define their career goals and work toward them through structured, actionable steps.

> **Project status:** In development 🚧

## ✨ Key Features

### 🎯 Personalized Career Planning

* Define your current role and target career.
* Specify your experience level and existing skills.
* Set a career goal and receive guidance tailored to your starting point.

### 🧠 Skill Gap Analysis

* Compare existing skills against the requirements of a target career.
* Identify missing skills and areas for improvement.
* Understand which skills to prioritize when planning your transition.

### 📊 Career Readiness Assessment

* Generate a readiness score based on available skill-matching logic.
* Identify transferable skills.
* Highlight areas that require further learning.

*The readiness score is an indicative planning tool, not a prediction of employment outcomes.*

### 🗺️ Personalized Learning Roadmaps

* Break a career goal into manageable learning tasks.
* Organize skill development into practical milestones.
* Work toward becoming internship-ready or transitioning into a new role.

### 💾 Progress Persistence

* Save supported application state using browser local storage.
* Preserve saved preferences and progress across page refreshes on the same browser.

### 🤖 AI-Powered Career Coaching — In Development

The project is being developed toward contextual AI career guidance, personalized recommendations, and interactive coaching.

AI-powered functionality depends on the integrations implemented in the current version.

## 🛠️ Tech Stack

### Frontend

* **React** — UI development
* **TypeScript** — type safety
* **Vite** — development server and build tooling
* **Tailwind CSS** — styling
* **Lucide React** — icons
* **Recharts** — data visualization

### Backend

* **Python**
* **FastAPI**
* **Pydantic**
* **SQLAlchemy**
* **SQLite** for local development

### AI Integration

* Claude API integration is a potential component of the project's AI coaching functionality.

*Technologies listed for backend and AI represent the intended stack; availability depends on the current implementation.*

## 🏗️ Project Structure

```text
CareerPIvotCoach/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── package.json
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── routes/
│       └── services/
└── README.md
```

The structure illustrates the intended organization and may differ from the current files as development progresses.

## 🚀 Getting Started

### Prerequisites

* Node.js
* npm
* Git

Python is additionally required to run the backend when it is available on your branch.

### 1. Clone the repository

```bash
git clone https://github.com/dudecoded/CareerPIvotCoach.git
cd CareerPIvotCoach
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

### 4. Build for production

```bash
npm run build
```

### 5. Run the linter

```bash
npm run lint
```

## ⚙️ Backend Setup

When the backend application is available in your current branch, create a Python virtual environment from the repository root.

**Windows PowerShell**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install fastapi uvicorn sqlalchemy pydantic
uvicorn app.main:app --reload
```

**macOS / Linux**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install fastapi uvicorn sqlalchemy pydantic
uvicorn app.main:app --reload
```

If the backend starts successfully, interactive API documentation is generally available at:

```text
http://127.0.0.1:8000/docs
```

Additional dependencies may be required depending on the im

