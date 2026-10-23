# MicroIntern Full Stack (Vite + TypeScript + FastAPI)

## Run backend (Terminal 1)
```bash
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Windows CMD: .venv\Scripts\activate.bat
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API docs: http://127.0.0.1:8000/docs | Health: http://127.0.0.1:8000/api/health

## Run frontend (Terminal 2, project root)
```bash
npm install
npm run dev
```
Open the Vite URL, normally http://localhost:5173. Keep both terminals running.

## Features
SQLite persistence, student registration/login, password hashing, signed bearer tokens, task browsing/search/filter endpoints, employer-only task creation, student applications, saved tasks, contact messages, admin statistics.

The website register form creates student accounts. To post a task, create an employer account in Swagger at `/docs` using `POST /api/auth/register` and JSON role `employer`, then log in on the site. Admin statistics require role `admin`.

Before public deployment, set `MICROINTERN_SECRET` to a strong random value and configure HTTPS, rate limiting, email verification, password reset and production CORS. This is a development starter.
