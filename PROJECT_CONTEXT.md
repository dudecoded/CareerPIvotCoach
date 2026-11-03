# CareerPivotCoach

## 1. Project Overview

CareerPivotCoach is a career transition and planning application that helps users identify transferable skills, understand skill gaps for a target career, and create a practical learning roadmap.

The goal is to develop it into a functional, portfolio-quality application rather than a static demo.

## 2. Tech Stack

Frontend:

* React
* TypeScript
* Vite
* CSS

Backend:

* Python
* FastAPI
* SQLAlchemy
* SQLite

## 3. Existing Features

* Career dashboard
* Career assessment form
* Six target career paths
* Skill matching and skill-gap analysis
* Readiness or skill-coverage score
* Learning roadmap
* Roadmap progress tracking
* LocalStorage persistence
* FastAPI assessment endpoint
* SQLite database integration
* Demo career-coach chat

## 4. Known Limitations

* The career-coach chat currently uses predefined responses rather than a live AI model.
* The assessment history functionality needs to be verified and integrated into the UI.
* Authentication and user-specific data need to be evaluated.
* The career assessment needs more meaningful personalization.
* All frontend and backend functionality must be tested before deployment.

## 5. Development Rules

1. Inspect existing code before proposing changes.
2. Do not rebuild the application from scratch.
3. Do not modify unrelated files.
4. Implement one feature at a time.
5. Explain the purpose of each change.
6. Prefer small, readable, maintainable functions.
7. Do not add dependencies without explaining why they are needed.
8. Never hardcode API keys or credentials.
9. Include error handling and relevant tests.
10. Provide commands to verify each change.
11. Preserve existing functionality unless a change is necessary.
12. Clearly distinguish implemented functionality from placeholders or mock responses.

## 6. Development Workflow

For every feature:

1. Understand the requirement.
2. Inspect the relevant files.
3. Propose the smallest viable implementation.
4. Implement the change.
5. Explain the modified code.
6. Run relevant tests or builds.
7. Review the Git diff.
8. Commit only after verification.
