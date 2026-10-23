# MicroIntern — frontend connected to FastAPI

## Run backend
From the `backend` folder:
```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
Backend URL: http://127.0.0.1:8000
API docs: http://127.0.0.1:8000/docs

## Run frontend
From the project root (same folder as package.json):
```powershell
npm install
npm run dev
```
Open the URL Vite prints, usually http://localhost:5173.

## Connected features
- Tasks and task details load from the FastAPI API, with local demo tasks as an offline fallback.
- Registration and login use `/api/auth/register` and `/api/auth/login`.
- Applying to a task uses `POST /api/tasks/{task_id}/apply` and requires a logged-in student.
- Saving/unsaving tasks uses `/api/saved/{task_id}` and requires login.
- Posting a task uses `POST /api/tasks` and requires an employer account.
- Contact form submits to `/api/contact`.

The API base defaults to `http://127.0.0.1:8000`. To change it, create a `.env` file in the project root:
```env
VITE_API_URL=http://127.0.0.1:8000
```

## Important
Use the same browser origin for the frontend during testing. The backend CORS configuration allows localhost/127.0.0.1 on Vite ports 5173 and 4173. Register a student account to test applying/saving. To post tasks, register with role `employer` (the current frontend registration form creates student accounts, so use the API docs for employer registration or add a role selector).
