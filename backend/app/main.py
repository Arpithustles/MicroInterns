from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import os, hashlib, secrets, hmac, base64, json, time
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
import psycopg
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
SECRET = os.getenv("MICROINTERN_SECRET", "")
if not SECRET:
    # Set MICROINTERN_SECRET in Render for production; this fallback keeps local development usable.
    SECRET = "dev-only-change-this-secret"

app = FastAPI(title="MicroIntern API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
        "https://micro-interns-n9ne.vercel.app",
    ],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


def normalized_database_url():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured. Add your PostgreSQL connection URL in Render Environment.")
    # Render may provide postgres://; psycopg accepts postgresql://.
    if DATABASE_URL.startswith("postgres://"):
        return "postgresql://" + DATABASE_URL[len("postgres://"):]
    return DATABASE_URL


def db():
    return psycopg.connect(normalized_database_url(), row_factory=dict_row, connect_timeout=10)


def init_db():
    statements = [
        """CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'student',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
        """CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, category TEXT NOT NULL,
            emoji TEXT DEFAULT '✦', description TEXT NOT NULL, pay INTEGER NOT NULL,
            duration TEXT NOT NULL, level TEXT DEFAULT 'Beginner friendly', skills TEXT DEFAULT '[]',
            featured INTEGER DEFAULT 0, posted TEXT DEFAULT 'Recently', deliverables TEXT DEFAULT '[]',
            owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL, status TEXT DEFAULT 'open',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
        """CREATE TABLE IF NOT EXISTS applications (
            id BIGSERIAL PRIMARY KEY, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, cover_letter TEXT DEFAULT '',
            status TEXT DEFAULT 'submitted', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(task_id, user_id))""",
        """CREATE TABLE IF NOT EXISTS saved_tasks (
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, task_id))""",
        """CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY, name TEXT, email TEXT, topic TEXT, message TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    ]
    seeds = [
        ('task-101','Redesign a landing page','Northstar Studio','Design','✳',"Refresh a small brand's landing page with a clear visual hierarchy, accessible colors and a mobile-first layout.",3500,'5 days','Beginner friendly',['Figma','UI design','Responsive design'],1,'Today',['A desktop landing page concept','Mobile layout','A short design rationale']),
        ('task-102','Clean and explore a dataset','DataSprout','Data','⌁','Review a customer dataset, clean common issues and share three useful observations in a concise notebook.',4500,'1 week','Intermediate',['Python','Pandas','Data analysis'],1,'Yesterday',['Cleaned dataset','Notebook with analysis','Three insight summaries']),
        ('task-103','Write a beginner-friendly guide','OpenPath Learning','Content','Aa','Turn a technical topic into a practical, well-structured guide that a first-year student can understand.',1800,'3 days','Beginner friendly',['Writing','Research','Editing'],0,'2 days ago',['800–1000 word guide','Two title options','Source list']),
        ('task-104','Build a small API endpoint','Crafted Systems','Development','⌘','Create a simple REST endpoint with validation, clear error responses and setup instructions.',6000,'1 week','Intermediate',['TypeScript','REST API','Git'],1,'Today',['Working endpoint','Basic tests','README instructions']),
        ('task-105','Research student communities','Campus Loop','Research','◎','Compare student communities and summarise the features that help members stay active and connected.',2200,'4 days','Beginner friendly',['Research','Spreadsheets','Communication'],0,'3 days ago',['Comparison sheet','Short findings report','Three recommendations']),
        ('task-106','Create social media templates','Goodday Foods','Marketing','↗','Design a small, consistent set of reusable social post templates for a growing local business.',2800,'5 days','Beginner friendly',['Canva','Social media','Branding'],0,'Yesterday',['Five post templates','Color and type notes','Editable source files']),
        ('task-107','Test a web app on mobile','Tiny Product Lab','Development','▣','Test a responsive web app on mobile sizes, report usability issues and document reproducible bugs.',2500,'3 days','Beginner friendly',['QA testing','Responsive UI','Documentation'],0,'4 days ago',['Bug report','Screenshots','Prioritised recommendations']),
        ('task-108','Make a short explainer video','BrightSteps','Content','▶','Create a short, captioned explainer video that introduces a student-focused product.',4000,'1 week','Intermediate',['Video editing','Storyboarding','Captions'],0,'5 days ago',['60–90 second video','Caption file','Storyboard']),
    ]
    with db() as c:
        with c.cursor() as cur:
            for sql in statements:
                cur.execute(sql)
            cur.execute("SELECT COUNT(*) AS count FROM tasks")
            if cur.fetchone()["count"] == 0:
                for row in seeds:
                    (tid,title,company,category,emoji,description,pay,duration,level,skills,featured,posted,deliverables) = row
                    cur.execute("""INSERT INTO tasks
                        (id,title,company,category,emoji,description,pay,duration,level,skills,featured,posted,deliverables)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING""",
                        (tid,title,company,category,emoji,description,pay,duration,level,json.dumps(skills),featured,posted,json.dumps(deliverables)))


@app.on_event("startup")
def startup():
    # Do not silently fall back to SQLite: fail clearly if DATABASE_URL is missing or PostgreSQL is unavailable.
    init_db()


class Register(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = 'student'

class Login(BaseModel):
    email: EmailStr
    password: str

class TaskCreate(BaseModel):
    title: str = Field(min_length=5, max_length=80)
    company: str
    category: str
    description: str = Field(min_length=30, max_length=5000)
    pay: int = Field(ge=100, le=500000)
    duration: str
    skills: list[str] = Field(default_factory=list)
    deliverables: list[str] = Field(default_factory=list)
    level: str = 'Student project'

class Contact(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    topic: str
    message: str = Field(min_length=10, max_length=5000)

class Application(BaseModel):
    cover_letter: str = ''


def hash_pw(password, salt=None):
    salt = salt or secrets.token_hex(16)
    return salt + '$' + hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 240000).hex()


def valid_pw(password, stored):
    try:
        salt, digest = stored.split('$', 1)
        return hmac.compare_digest(hash_pw(password, salt).split('$', 1)[1], digest)
    except Exception:
        return False


def token(user):
    payload = base64.urlsafe_b64encode(json.dumps({'sub': user['id'], 'exp': int(time.time()) + 86400}).encode()).decode().rstrip('=')
    signature = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return payload + '.' + signature


def user_required(authorization: Optional[str] = Header(default=None)):
    try:
        if not authorization or not authorization.lower().startswith('bearer '):
            raise ValueError()
        payload, signature = authorization[7:].split('.', 1)
        expected = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        data = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        if data['exp'] < time.time():
            raise ValueError()
        with db() as c:
            row = c.execute('SELECT id,name,email,role,created_at FROM users WHERE id=%s', (data['sub'],)).fetchone()
        if not row:
            raise ValueError()
        return row
    except Exception:
        raise HTTPException(401, 'Please log in again; your session is invalid or expired.')


def out(row):
    data = dict(row)
    data['skills'] = json.loads(data['skills'] or '[]')
    data['deliverables'] = json.loads(data['deliverables'] or '[]')
    data['featured'] = bool(data['featured'])
    return data


@app.get('/')
def root():
    return {'name': 'MicroIntern API', 'status': 'running', 'docs': '/docs'}

@app.get('/api/health')
def health():
    try:
        with db() as c:
            row = c.execute('SELECT current_database() AS database, 1 AS ok').fetchone()
        return {'status': 'ok', 'database': 'postgresql', 'database_name': row['database'], 'connection': 'ok'}
    except Exception as exc:
        raise HTTPException(503, f'PostgreSQL connection failed: {type(exc).__name__}')

@app.post('/api/auth/register', status_code=201)
def register(x: Register):
    role = x.role if x.role in ('student', 'employer') else 'student'
    try:
        with db() as c:
            row = c.execute('''INSERT INTO users(name,email,password_hash,role) VALUES(%s,%s,%s,%s)
                RETURNING id,name,email,role,created_at''',
                (x.name.strip(), x.email.lower(), hash_pw(x.password), role)).fetchone()
        user = dict(row)
    except UniqueViolation:
        raise HTTPException(409, 'This email already has an account.')
    return {'token': token(user), 'user': user}

@app.post('/api/auth/login')
def login(x: Login):
    with db() as c:
        row = c.execute('SELECT * FROM users WHERE email=%s', (x.email.lower(),)).fetchone()
    if not row or not valid_pw(x.password, row['password_hash']):
        raise HTTPException(401, 'Email or password is incorrect.')
    user = {key: row[key] for key in ('id','name','email','role','created_at')}
    return {'token': token(user), 'user': user}

@app.get('/api/auth/me')
def me(user=Depends(user_required)):
    return {'user': user}

@app.get('/api/tasks')
def tasks(category: Optional[str] = None, q: Optional[str] = None, sort: Optional[str] = None):
    sql = "SELECT * FROM tasks WHERE status='open'"
    args = []
    if category and category.lower() != 'all':
        sql += ' AND lower(category)=lower(%s)'; args.append(category)
    if q:
        sql += ' AND (lower(title) LIKE %s OR lower(company) LIKE %s OR lower(description) LIKE %s)'
        args += [f'%{q.lower()}%'] * 3
    sort_key = (sort or '').lower()
    sql += {'high':' ORDER BY pay DESC','low':' ORDER BY pay ASC','az':' ORDER BY title ASC'}.get(sort_key, ' ORDER BY featured DESC,created_at DESC')
    with db() as c:
        rows = c.execute(sql, args).fetchall()
    return [out(row) for row in rows]

@app.get('/api/tasks/{task_id}')
def task(task_id: str):
    with db() as c:
        row = c.execute("SELECT * FROM tasks WHERE id=%s AND status='open'", (task_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Task not found')
    return out(row)

@app.post('/api/tasks', status_code=201)
def create_task(x: TaskCreate, user=Depends(user_required)):
    if user['role'] not in ('employer', 'admin'):
        raise HTTPException(403, 'Employer account required to post tasks.')
    task_id = 'task-' + secrets.token_hex(6)
    emoji = {'Design':'✳','Data':'⌁','Content':'Aa','Development':'⌘','Research':'◎','Marketing':'↗'}.get(x.category, '✦')
    with db() as c:
        row = c.execute('''INSERT INTO tasks(id,title,company,category,emoji,description,pay,duration,level,skills,deliverables,owner_id,posted)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
            (task_id,x.title,x.company,x.category,emoji,x.description,x.pay,x.duration,x.level,json.dumps(x.skills),json.dumps(x.deliverables),user['id'],'just now')).fetchone()
    return out(row)

@app.post('/api/tasks/{task_id}/apply', status_code=201)
def apply(task_id: str, x: Application, user=Depends(user_required)):
    if user['role'] != 'student':
        raise HTTPException(403, 'Student account required.')
    try:
        with db() as c:
            exists = c.execute("SELECT 1 FROM tasks WHERE id=%s AND status='open'", (task_id,)).fetchone()
            if not exists:
                raise HTTPException(404, 'Task not found.')
            c.execute('INSERT INTO applications(task_id,user_id,cover_letter) VALUES(%s,%s,%s)', (task_id,user['id'],x.cover_letter))
    except UniqueViolation:
        raise HTTPException(409, 'Already applied to this task.')
    return {'message': 'Application submitted successfully.'}

@app.get('/api/me/applications')
def applications(user=Depends(user_required)):
    with db() as c:
        rows = c.execute('''SELECT a.id,a.task_id,a.status,a.created_at,t.title,t.company,t.pay
            FROM applications a JOIN tasks t ON t.id=a.task_id WHERE a.user_id=%s ORDER BY a.created_at DESC''', (user['id'],)).fetchall()
    return [dict(row) for row in rows]

@app.get('/api/me/saved')
def saved(user=Depends(user_required)):
    with db() as c:
        rows = c.execute('SELECT t.* FROM saved_tasks s JOIN tasks t ON t.id=s.task_id WHERE s.user_id=%s', (user['id'],)).fetchall()
    return [out(row) for row in rows]

@app.post('/api/me/saved/{task_id}')
def save(task_id: str, user=Depends(user_required)):
    with db() as c:
        if not c.execute('SELECT 1 FROM tasks WHERE id=%s', (task_id,)).fetchone():
            raise HTTPException(404, 'Task not found.')
        c.execute('INSERT INTO saved_tasks(user_id,task_id) VALUES(%s,%s) ON CONFLICT(user_id,task_id) DO NOTHING', (user['id'],task_id))
    return {'saved': True}

@app.delete('/api/me/saved/{task_id}')
def unsave(task_id: str, user=Depends(user_required)):
    with db() as c:
        c.execute('DELETE FROM saved_tasks WHERE user_id=%s AND task_id=%s', (user['id'],task_id))
    return {'saved': False}

@app.post('/api/contact', status_code=201)
def contact(x: Contact):
    with db() as c:
        c.execute('INSERT INTO messages(name,email,topic,message) VALUES(%s,%s,%s,%s)', (x.name,x.email.lower(),x.topic,x.message))
    return {'message': 'Your message has been received.'}

@app.get('/api/admin/stats')
def admin_stats(user=Depends(user_required)):
    if user['role'] != 'admin':
        raise HTTPException(403, 'Admin access required.')
    with db() as c:
        result = {}
        for table in ('users','tasks','applications','messages'):
            result[table] = c.execute(f'SELECT COUNT(*) AS count FROM {table}').fetchone()['count']
    return result
