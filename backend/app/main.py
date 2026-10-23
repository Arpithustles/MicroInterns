from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# Database and secret can be configured through environment variables.
DB = os.getenv(
    "MICROINTERN_DB",
    str(Path(__file__).resolve().parent / "microintern.db"),
)
SECRET = os.getenv(
    "MICROINTERN_SECRET",
    "dev-only-change-this-secret-before-deployment",
)

app = FastAPI(title="MicroIntern API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:5177/",
        "http://127.0.0.1:5177",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db() -> sqlite3.Connection:
    """Open a SQLite connection and return rows as mapping-like objects."""
    connection = sqlite3.connect(DB, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    """Create tables and add demo tasks if the tasks table is empty."""
    connection = db()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                phone TEXT,
                date_of_birth TEXT,
                skills TEXT NOT NULL DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                category TEXT NOT NULL,
                emoji TEXT DEFAULT '✦',
                description TEXT NOT NULL,
                pay INTEGER NOT NULL,
                duration TEXT NOT NULL,
                level TEXT DEFAULT 'Beginner friendly',
                skills TEXT DEFAULT '[]',
                featured INTEGER DEFAULT 0,
                posted TEXT DEFAULT 'Recently',
                deliverables TEXT DEFAULT '[]',
                owner_id INTEGER,
                status TEXT DEFAULT 'open',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                cover_letter TEXT DEFAULT '',
                status TEXT DEFAULT 'submitted',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(task_id, user_id),
                FOREIGN KEY(task_id) REFERENCES tasks(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS saved_tasks (
                user_id INTEGER NOT NULL,
                task_id TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY(user_id, task_id),
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(task_id) REFERENCES tasks(id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                topic TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # Add profile fields to existing databases created by older versions.
        existing_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        for column, definition in (
            ("phone", "TEXT"),
            ("date_of_birth", "TEXT"),
            ("skills", "TEXT NOT NULL DEFAULT '[]'"),
        ):
            if column not in existing_columns:
                connection.execute(f"ALTER TABLE users ADD COLUMN {column} {definition}")

        seeds = [
            (
                "task-101", "Redesign a landing page", "Northstar Studio",
                "Design", "✳",
                "Refresh a small brand's landing page with a clear visual hierarchy, accessible colors and a mobile-first layout.",
                3500, "5 days", "Beginner friendly",
                ["Figma", "UI design", "Responsive design"], 1, "Today",
                ["A desktop landing page concept", "Mobile layout", "A short design rationale"],
            ),
            (
                "task-102", "Clean and explore a dataset", "DataSprout",
                "Data", "⌁",
                "Review a customer dataset, clean common issues and share three useful observations in a concise notebook.",
                4500, "1 week", "Intermediate",
                ["Python", "Pandas", "Data analysis"], 1, "Yesterday",
                ["Cleaned dataset", "Notebook with analysis", "Three insight summaries"],
            ),
            (
                "task-103", "Write a beginner-friendly guide", "OpenPath Learning",
                "Content", "Aa",
                "Turn a technical topic into a practical, well-structured guide that a first-year student can understand.",
                1800, "3 days", "Beginner friendly",
                ["Writing", "Research", "Editing"], 0, "2 days ago",
                ["800–1000 word guide", "Two title options", "Source list"],
            ),
            (
                "task-104", "Build a small API endpoint", "Crafted Systems",
                "Development", "⌘",
                "Create a simple REST endpoint with validation, clear error responses and setup instructions.",
                6000, "1 week", "Intermediate",
                ["Python", "REST API", "Git"], 1, "Today",
                ["Working endpoint", "Basic tests", "README instructions"],
            ),
            (
                "task-105", "Research student communities", "Campus Loop",
                "Research", "◎",
                "Compare student communities and summarise the features that help members stay active and connected.",
                2200, "4 days", "Beginner friendly",
                ["Research", "Spreadsheets", "Communication"], 0, "3 days ago",
                ["Comparison sheet", "Short findings report", "Three recommendations"],
            ),
            (
                "task-106", "Create social media templates", "Goodday Foods",
                "Marketing", "↗",
                "Design a small, consistent set of reusable social post templates for a growing local business.",
                2800, "5 days", "Beginner friendly",
                ["Canva", "Social media", "Branding"], 0, "Yesterday",
                ["Five post templates", "Color and type notes", "Editable source files"],
            ),
            (
                "task-107", "Test a web app on mobile", "Tiny Product Lab",
                "Development", "▣",
                "Test a responsive web app on mobile sizes, report usability issues and document reproducible bugs.",
                2500, "3 days", "Beginner friendly",
                ["QA testing", "Responsive UI", "Documentation"], 0, "4 days ago",
                ["Bug report", "Screenshots", "Prioritised recommendations"],
            ),
            (
                "task-108", "Make a short explainer video", "BrightSteps",
                "Content", "▶",
                "Create a short, captioned explainer video that introduces a student-focused product.",
                4000, "1 week", "Intermediate",
                ["Video editing", "Storyboarding", "Captions"], 0, "5 days ago",
                ["60–90 second video", "Caption file", "Storyboard"],
            ),
        ]

        task_count = connection.execute(
            "SELECT COUNT(*) FROM tasks"
        ).fetchone()[0]
        if task_count == 0:
            connection.executemany(
                """
                INSERT INTO tasks (
                    id, title, company, category, emoji, description, pay,
                    duration, level, skills, featured, posted, deliverables
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        task_id, title, company, category, emoji, description,
                        pay, duration, level, json.dumps(skills), featured,
                        posted, json.dumps(deliverables),
                    )
                    for (
                        task_id, title, company, category, emoji, description,
                        pay, duration, level, skills, featured, posted,
                        deliverables,
                    ) in seeds
                ],
            )
        connection.commit()
    finally:
        connection.close()


init_db()


# ----------------------------- Request models -----------------------------

class Register(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "student"


class Login(BaseModel):
    email: EmailStr
    password: str


class PasswordReset(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TaskCreate(BaseModel):
    title: str = Field(min_length=5, max_length=80)
    company: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=30, max_length=5000)
    pay: int = Field(ge=100, le=500000)
    duration: str = Field(min_length=2, max_length=80)
    skills: list[str] = Field(default_factory=list)
    deliverables: list[str] = Field(default_factory=list)
    level: str = "Student project"


class Contact(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    topic: str = Field(min_length=2, max_length=150)
    message: str = Field(min_length=10, max_length=5000)


class Application(BaseModel):
    cover_letter: str = Field(default="", max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=30)


# ------------------------------- Utilities --------------------------------

def hash_pw(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt_value.encode("utf-8"), 240000
    ).hex()
    return f"{salt_value}${digest}"


def valid_pw(password: str, stored_hash: str) -> bool:
    try:
        salt_value, digest = stored_hash.split("$", 1)
        candidate = hash_pw(password, salt_value).split("$", 1)[1]
        return hmac.compare_digest(candidate, digest)
    except (ValueError, TypeError):
        return False


def token(user: dict) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps(
            {"sub": user["id"], "exp": int(time.time()) + 86400}
        ).encode("utf-8")
    ).decode("ascii").rstrip("=")
    signature = hmac.new(
        SECRET.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"


def user_required(
    authorization: str | None = Header(default=None),
) -> dict:
    try:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise ValueError("Missing bearer token")

        payload, signature = authorization[7:].split(".", 1)
        expected = hmac.new(
            SECRET.encode("utf-8"), payload.encode("ascii"), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid signature")

        padding = "=" * (-len(payload) % 4)
        data = json.loads(
            base64.urlsafe_b64decode(payload + padding).decode("utf-8")
        )
        if data.get("exp", 0) < time.time():
            raise ValueError("Expired token")

        connection = db()
        try:
            row = connection.execute(
                "SELECT id, name, email, role, phone, date_of_birth, skills, created_at FROM users WHERE id = ?",
                (data["sub"],),
            ).fetchone()
        finally:
            connection.close()

        if row is None:
            raise ValueError("User not found")
        user = dict(row)
        try:
            user["skills"] = json.loads(user.get("skills") or "[]")
        except (TypeError, json.JSONDecodeError):
            user["skills"] = []
        return user
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(
            status_code=401,
            detail="Please log in again; your session is invalid or expired.",
        ) from exc


def out(row: sqlite3.Row) -> dict:
    result = dict(row)
    for key in ("skills", "deliverables"):
        try:
            result[key] = json.loads(result.get(key) or "[]")
        except (TypeError, json.JSONDecodeError):
            result[key] = []
    result["featured"] = bool(result.get("featured", 0))
    return result


def get_task_or_404(connection: sqlite3.Connection, task_id: str) -> sqlite3.Row:
    row = connection.execute(
        "SELECT * FROM tasks WHERE id = ? AND status = 'open'", (task_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return row


# -------------------------------- Endpoints --------------------------------

@app.get("/")
def root() -> dict:
    return {"name": "MicroIntern API", "status": "running", "docs": "/docs"}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "database": "sqlite"}


@app.post("/api/auth/register", status_code=201)
def register(data: Register) -> dict:
    role = data.role if data.role in ("student", "employer") else "student"
    connection = db()
    try:
        cursor = connection.execute(
            "INSERT INTO users(name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (data.name.strip(), data.email.lower(), hash_pw(data.password), role),
        )
        connection.commit()
        row = connection.execute(
            "SELECT id, name, email, role, phone, date_of_birth, skills, created_at FROM users WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        user = dict(row)
        user["skills"] = json.loads(user.get("skills") or "[]")
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=409, detail="This email already has an account."
        ) from exc
    finally:
        connection.close()
    return {"token": token(user), "user": user}


@app.post("/api/auth/login")
def login(data: Login) -> dict:
    connection = db()
    try:
        row = connection.execute(
            "SELECT * FROM users WHERE email = ?", (data.email.lower(),)
        ).fetchone()
    finally:
        connection.close()

    if row is None or not valid_pw(data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    user = {key: row[key] for key in ("id", "name", "email", "role", "phone", "date_of_birth", "skills", "created_at")}
    user["skills"] = json.loads(user.get("skills") or "[]")
    return {"token": token(user), "user": user}


@app.post("/api/auth/reset-password")
def reset_password(data: PasswordReset) -> dict:
    """Prototype-only password reset. Production should use verified, expiring email reset tokens."""
    connection = db()
    try:
        cursor = connection.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (hash_pw(data.password), data.email.lower()),
        )
        connection.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="No account was found for that email address.")
        return {"message": "Password reset successfully. Please log in with your new password."}
    finally:
        connection.close()


@app.get("/api/auth/me")
def me(user: dict = Depends(user_required)) -> dict:
    return {"user": user}


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=25)
    date_of_birth: str | None = Field(default=None, max_length=10)
    skills: list[str] | None = None


@app.get("/api/me/profile")
def get_profile(user: dict = Depends(user_required)) -> dict:
    return {"user": user}


@app.patch("/api/me/profile")
def update_profile(data: ProfileUpdate, user: dict = Depends(user_required)) -> dict:
    updates = data.model_dump(exclude_unset=True)
    if "skills" in updates and updates["skills"] is not None:
        clean_skills = []
        for skill in updates["skills"]:
            value = skill.strip()
            if value and value.lower() not in [item.lower() for item in clean_skills]:
                clean_skills.append(value[:40])
        updates["skills"] = json.dumps(clean_skills[:50])
    allowed = {"name", "phone", "date_of_birth", "skills"}
    updates = {key: value for key, value in updates.items() if key in allowed}
    if not updates:
        return {"user": user}
    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()
    connection = db()
    try:
        assignments = ", ".join(f"{key} = ?" for key in updates)
        connection.execute(
            f"UPDATE users SET {assignments} WHERE id = ?",
            [*updates.values(), user["id"]],
        )
        connection.commit()
        row = connection.execute(
            "SELECT id, name, email, role, phone, date_of_birth, skills, created_at FROM users WHERE id = ?",
            (user["id"],),
        ).fetchone()
        updated = dict(row)
        updated["skills"] = json.loads(updated.get("skills") or "[]")
        return {"user": updated}
    finally:
        connection.close()


@app.get("/api/tasks")
def list_tasks(
    category: str | None = None,
    q: str | None = None,
    sort: str | None = None,
) -> list[dict]:
    connection = db()
    try:
        sql = "SELECT * FROM tasks WHERE status = 'open'"
        params: list[object] = []

        if category and category.lower() != "all":
            sql += " AND lower(category) = lower(?)"
            params.append(category)

        if q:
            sql += " AND (lower(title) LIKE ? OR lower(company) LIKE ? OR lower(description) LIKE ?)"
            search_term = f"%{q.lower()}%"
            params.extend([search_term, search_term, search_term])

        order_by = {
        "high": " ORDER BY pay DESC",
        "low": " ORDER BY pay ASC",
        "az": " ORDER BY title ASC",
        }.get(sort or "", " ORDER BY featured DESC, created_at DESC")

        rows = connection.execute(
            sql + order_by,
            params
        ).fetchall()

        return [out(row) for row in rows]

    finally:
        connection.close()

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str) -> dict:
    connection = db()
    try:
        return out(get_task_or_404(connection, task_id))
    finally:
        connection.close()


@app.post("/api/tasks", status_code=201)
def create_task(data: TaskCreate, user: dict = Depends(user_required)) -> dict:
    if user["role"] not in ("employer", "admin"):
        raise HTTPException(
            status_code=403, detail="Employer account required to post tasks."
        )

    task_id = "task-" + secrets.token_hex(6)
    emoji = {
        "Design": "✳",
        "Data": "⌁",
        "Content": "Aa",
        "Development": "⌘",
        "Research": "◎",
        "Marketing": "↗",
    }.get(data.category, "✦")

    connection = db()
    try:
        connection.execute(
            """
            INSERT INTO tasks (
                id, title, company, category, emoji, description, pay, duration,
                level, skills, deliverables, owner_id, posted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task_id, data.title.strip(), data.company.strip(),
                data.category.strip(), emoji, data.description.strip(), data.pay,
                data.duration.strip(), data.level,
                json.dumps(data.skills), json.dumps(data.deliverables),
                user["id"], "just now",
            ),
        )
        connection.commit()
        row = connection.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
        return out(row)
    finally:
        connection.close()


@app.post("/api/tasks/{task_id}/apply", status_code=201)
def apply_to_task(
    task_id: str,
    data: Application,
    user: dict = Depends(user_required),
) -> dict:
    if user["role"] != "student":
        raise HTTPException(
            status_code=403, detail="Only student accounts can apply to tasks."
        )

    connection = db()
    try:
        get_task_or_404(connection, task_id)
        try:
            cursor = connection.execute(
                "INSERT INTO applications(task_id, user_id, cover_letter) VALUES (?, ?, ?)",
                (task_id, user["id"], data.cover_letter.strip()),
            )
            connection.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(
                status_code=409, detail="You have already applied to this task."
            ) from exc

        row = connection.execute(
            "SELECT id, task_id, user_id, cover_letter, status, created_at "
            "FROM applications WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        return dict(row)
    finally:
        connection.close()


@app.get("/api/applications")
def my_applications(user: dict = Depends(user_required)) -> list[dict]:
    connection = db()
    try:
        rows = connection.execute(
            """
            SELECT a.id, a.task_id, a.user_id, a.cover_letter, a.status,
                   a.created_at, t.title AS task_title, t.company, t.pay
            FROM applications a
            JOIN tasks t ON t.id = a.task_id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


@app.get("/api/saved")
def list_saved_tasks(user: dict = Depends(user_required)) -> list[dict]:
    connection = db()
    try:
        rows = connection.execute(
            """
            SELECT t.* FROM saved_tasks s
            JOIN tasks t ON t.id = s.task_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
        return [out(row) for row in rows]
    finally:
        connection.close()


@app.post("/api/saved/{task_id}", status_code=201)
def save_task(task_id: str, user: dict = Depends(user_required)) -> dict:
    connection = db()
    try:
        get_task_or_404(connection, task_id)
        try:
            connection.execute(
                "INSERT INTO saved_tasks(user_id, task_id) VALUES (?, ?)",
                (user["id"], task_id),
            )
            connection.commit()
        except sqlite3.IntegrityError:
            # Saving an already-saved task is safe and idempotent.
            pass
        return {"saved": True, "task_id": task_id}
    finally:
        connection.close()


@app.delete("/api/saved/{task_id}")
def unsave_task(task_id: str, user: dict = Depends(user_required)) -> dict:
    connection = db()
    try:
        connection.execute(
            "DELETE FROM saved_tasks WHERE user_id = ? AND task_id = ?",
            (user["id"], task_id),
        )
        connection.commit()
        return {"saved": False, "task_id": task_id}
    finally:
        connection.close()


@app.post("/api/contact", status_code=201)
def contact(data: Contact) -> dict:
    connection = db()
    try:
        cursor = connection.execute(
            "INSERT INTO messages(name, email, topic, message) VALUES (?, ?, ?, ?)",
            (
                data.name.strip(), data.email.lower(), data.topic.strip(),
                data.message.strip(),
            ),
        )
        connection.commit()
        return {"success": True, "message_id": cursor.lastrowid}
    finally:
        connection.close()


@app.get("/api/employer/applications")
def employer_applications(user: dict = Depends(user_required)) -> list[dict]:
    if user["role"] not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Employer account required.")

    connection = db()
    try:
        sql = """
            SELECT a.id, a.task_id, a.user_id, a.cover_letter, a.status,
                   a.created_at, u.name AS student_name, u.email AS student_email,
                   t.title AS task_title, t.company
            FROM applications a
            JOIN tasks t ON t.id = a.task_id
            JOIN users u ON u.id = a.user_id
        """
        params: tuple = ()
        if user["role"] != "admin":
            sql += " WHERE t.owner_id = ?"
            params = (user["id"],)
        sql += " ORDER BY a.created_at DESC"
        return [dict(row) for row in connection.execute(sql, params).fetchall()]
    finally:
        connection.close()


@app.patch("/api/employer/applications/{application_id}")
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    user: dict = Depends(user_required),
) -> dict:
    if user["role"] not in ("employer", "admin"):
        raise HTTPException(status_code=403, detail="Employer account required.")

    allowed_statuses = {"submitted", "reviewing", "accepted", "rejected"}
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Status must be one of: {', '.join(sorted(allowed_statuses))}.",
        )

    connection = db()
    try:
        if user["role"] == "admin":
            cursor = connection.execute(
                "UPDATE applications SET status = ? WHERE id = ?",
                (data.status, application_id),
            )
        else:
            cursor = connection.execute(
                """
                UPDATE applications SET status = ?
                WHERE id = ? AND task_id IN (
                    SELECT id FROM tasks WHERE owner_id = ?
                )
                """,
                (data.status, application_id, user["id"]),
            )
        connection.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Application not found.")
        return {"success": True, "application_id": application_id, "status": data.status}
    finally:
        connection.close()


@app.get("/api/admin/stats")
def admin_stats(user: dict = Depends(user_required)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin account required.")

    connection = db()
    try:
        users_count = connection.execute(
            "SELECT COUNT(*) FROM users"
        ).fetchone()[0]
        tasks_count = connection.execute(
            "SELECT COUNT(*) FROM tasks"
        ).fetchone()[0]
        applications_count = connection.execute(
            "SELECT COUNT(*) FROM applications"
        ).fetchone()[0]
        messages_count = connection.execute(
            "SELECT COUNT(*) FROM messages"
        ).fetchone()[0]
        return {
            "users": users_count,
            "tasks": tasks_count,
            "applications": applications_count,
            "messages": messages_count,
        }
    finally:
        connection.close()


@app.get("/api/admin/messages")
def admin_messages(
    limit: int = Query(default=100, ge=1, le=500),
    user: dict = Depends(user_required),
) -> list[dict]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin account required.")

    connection = db()
    try:
        rows = connection.execute(
            "SELECT * FROM messages ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()
