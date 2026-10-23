# MicroIntern Full Stack (Vite + TypeScript + FastAPI)

## Run Backend (Terminal 1)

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.venv\Scripts\Activate.ps1
```

**Windows CMD**
```bat
.venv\Scripts\activate.bat
```

Install dependencies and start the backend:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

## Run Frontend (Terminal 2)

Open a second terminal in the project root:

```bash
npm install
npm run dev
```

Open the Vite URL, normally http://localhost:5173.

Keep both terminals running.

## Features

- Student registration and login
- Password hashing and signed bearer tokens
- Task browsing, searching, and filtering
- Employer-only task creation
- Student applications and saved tasks
- Contact messages and admin statistics
- SQLite persistence

## Account Roles

- **Student:** Register through the website.
- **Employer:** Register through `POST /api/auth/register` in Swagger at `/docs` using the `employer` role, then log in.
- **Admin:** Admin statistics require the `admin` role.

## Before Production Deployment

- Set `MICROINTERN_SECRET` to a strong, unique random value.
- Configure HTTPS and production CORS.
- Configure persistent database storage.
- Add rate limiting, email verification, and password reset functionality as required.

This project is a development starter. Review authentication, authorization, and production security before deploying publicly.

Innotech 26
