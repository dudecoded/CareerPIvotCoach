# Development workflow

This guide describes a safe workflow for making and reviewing changes in CareerPivotCoach.

## Start from the latest default branch

```bash
git switch main
git pull origin main
```

Create a focused branch for one feature or fix:

```bash
git switch -c feat/short-description
```

Use a descriptive branch prefix:
- `feat/` for a new feature
- `fix/` for a bug fix
- `docs/` for documentation
- `chore/` for maintenance

## Make and verify a change

Keep each commit focused and describe the outcome:

```bash
git status
git add path/to/the-files-you-changed
git commit -m "feat: describe the change"
```

Before opening a pull request, run the checks available in your current branch.

Frontend (from `frontend/`):
```bash
npm run lint
npm run build
```

Backend (from `backend/`, with its virtual environment activated):
```bash
python -m pytest
```

If a command is not configured in the current branch, check that branch's README and package scripts rather than assuming it exists.

## Push and open a pull request

```bash
git push -u origin feat/short-description
```

Open a pull request from your feature branch into `main`. Review the changed files and wait for required CI checks to pass before merging.

If `main` has moved while your branch was in progress, update your branch deliberately and resolve conflicts by preserving the intended behavior from both sides. Re-run the checks after conflict resolution.

## Keep secrets and local files out of Git

- Never commit API keys, OAuth client secrets, passwords, access tokens, or real `.env` files.
- Put local-only configuration in ignored files such as `.env.local`.
- Provide safe placeholders in tracked `.env.example` files.
- Stage specific files instead of using `git add .` when backups, generated files, or local scripts may be present.
- Keep virtual environments, dependency caches, build output, and personal backups out of commits.

## Contribution history

GitHub's contribution graph has eligibility rules. Commits generally need to be associated with the account's verified commit email and reach the repository's default branch (or `gh-pages`) to count toward the graph. A commit on an unmerged feature branch may not appear as a contribution yet. See GitHub's contribution documentation for the current rules.