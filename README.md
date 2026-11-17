# Student Collab Hub

**Academic Project Tracker & Team Collaboration Assistant**

> 🚀 **Live App:** [https://student-collab-hub-hazel.vercel.app](https://student-collab-hub-hazel.vercel.app)

---

## Overview

Student Collab Hub is a full-stack web application that helps students organise coursework, manage projects, track tasks, and collaborate with teammates — all from a clean, responsive dark-mode interface. It is deployed as a Vercel Serverless application backed by TiDB Cloud Serverless (MySQL-compatible).

---

## Key Features

### 🔐 Authentication
- **Register & Sign In** with email + password (bcrypt hashing)
- Dual auth strategy: **JWT tokens** (sent in `Authorization` header) + **express-session** (cookie-based fallback)
- **Password visibility toggle** on all password fields (eye icon, zero layout shift)
- Input validation via `express-validator` on every endpoint
- Protected routes — unauthenticated requests are redirected to the login page

### 📋 Workspace Dashboard
- Summary stats bar: **Total Projects**, **Total Tasks**, **Active Collaborations** — computed dynamically from live data
- Project cards with monogram badge, role pill (Owner / Member), member count, and task count
- **Search & filter** projects by name or keyword
- One-click **"+ Create Project"** modal — form validates, inserts into TiDB, and refreshes the grid instantly

### 📁 Project Management
- Create, view, update, and delete projects (owner-only write operations)
- **Member management**: invite collaborators by email or user ID; assign roles (`member` / `lead`)
- Leads and owners can remove members; members can leave voluntarily

### ✅ Task / Milestone Management
- Full task CRUD within each project board (`project.html`)
- Task fields: title, description, **status** (`todo` / `in_progress` / `done`), **priority** (`low` / `medium` / `high` / `critical`), assignee, reporter, due date
- Tasks sorted by priority (critical → high → medium → low), then by creation date
- Filtered views by status and priority; paginated API responses

### 💬 Comments & Activity
- Threaded comments per task with author details
- Paginated comment list (oldest-first chronological order)
- Comment authors can edit or delete their own comments

### 🎨 UI / UX
- **Responsive dark-mode UI** (`#0f172a` background, `#1e293b` card surfaces, `#3b82f6` primary accent) across all three pages
- Single shared `public/css/style.css` — no framework dependencies
- Toast notification system for success/error feedback
- Auth card features the "Student Collab Hub" brand name and tagline

---

## Tech Stack & Architecture

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3 (custom dark-theme design system), Vanilla JavaScript (ES Modules) |
| **Backend** | Node.js (v18+), Express 4, ES Module syntax (`"type": "module"`) |
| **Auth** | JWT (`jsonwebtoken`), express-session + express-mysql-session |
| **Database** | TiDB Cloud Serverless (MySQL-compatible) via `mysql2/promise` |
| **Security** | Helmet, CORS, bcryptjs, input validation (express-validator) |
| **Deployment** | Vercel Serverless Functions (`@vercel/node`) + Static (`@vercel/static`) |
| **Dev tooling** | Nodemon, dotenv |

### Request Flow (Vercel)

```
Browser
  │
  ├─ /api/*  ──► Vercel Serverless Function (src/app.js)
  │                └─► Express router → controller → TiDB Cloud
  │
  └─ /*      ──► Vercel Static (public/)
```

The MySQL connection pool is **lazily initialised** on first request so cold-start serverless invocations never fail before env vars are ready. SSL is automatically enabled when `DB_SSL=true` or `NODE_ENV=production`.

---

## Project Structure

```
student-collab-hub/
├── config/
│   ├── database.js          # Lazy MySQL pool + query helpers
│   ├── env.js               # Validated env var loader
│   └── session.js           # express-session + MySQL session store
│
├── database/
│   └── schema.sql           # Full DB schema (users, projects, project_members, tasks, task_comments, sessions)
│
├── public/                  # Static frontend (served by Vercel)
│   ├── index.html           # Login / Register page
│   ├── dashboard.html       # Workspace dashboard
│   ├── project.html         # Project board (tasks & members)
│   ├── css/
│   │   └── style.css        # Unified dark-theme design system
│   └── js/
│       ├── components/
│       │   └── toast.js     # Toast notification component
│       ├── pages/
│       │   ├── auth.js      # Auth page logic (login/register toggle)
│       │   ├── dashboard.js # Dashboard data-fetching & rendering
│       │   └── project.js   # Project board logic (tasks, members)
│       └── utils/
│           └── api.js       # Fetch wrapper (JWT header injection, error handling)
│
├── src/                     # Express backend
│   ├── app.js               # Express app factory (exported for Vercel)
│   ├── server.js            # Local dev entry point (calls app.listen)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   └── commentController.js
│   ├── middleware/
│   │   ├── auth.js          # requireAuth (JWT + session)
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   └── commentRoutes.js
│   ├── services/
│   │   └── authService.js   # register / login business logic
│   ├── utils/
│   │   ├── db.js            # paginate() helper
│   │   ├── jwt.js           # Token generation & verification
│   │   ├── password.js      # bcrypt wrappers
│   │   └── responses.js     # Standardised API response helpers
│   └── validators/          # express-validator rule sets
│       ├── authValidator.js
│       ├── projectValidator.js
│       ├── taskValidator.js
│       └── commentValidator.js
│
├── .env.example             # Environment variable template
├── .gitignore
├── package.json
├── vercel.json              # Vercel build & routing config
└── README.md
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | ❌ | Register a new user |
| `POST` | `/api/v1/auth/login` | ❌ | Login and receive JWT |
| `POST` | `/api/v1/auth/logout` | ✅ | Destroy session |
| `GET`  | `/api/v1/auth/me` | ✅ | Get current user profile |
| `GET`  | `/api/v1/projects` | ✅ | List projects (paginated, filterable) |
| `POST` | `/api/v1/projects` | ✅ | Create a project |
| `GET`  | `/api/v1/projects/:id` | ✅ | Get project + members |
| `PUT`  | `/api/v1/projects/:id` | ✅ | Update project (owner only) |
| `DELETE` | `/api/v1/projects/:id` | ✅ | Delete project (owner only) |
| `POST` | `/api/v1/projects/:id/members` | ✅ | Add member by email or userId |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | ✅ | Remove member |
| `GET`  | `/api/v1/tasks` | ✅ | List tasks for a project |
| `POST` | `/api/v1/tasks` | ✅ | Create task |
| `PUT`  | `/api/v1/tasks/:id` | ✅ | Update task |
| `DELETE` | `/api/v1/tasks/:id` | ✅ | Delete task |
| `GET`  | `/api/v1/comments` | ✅ | Get comments for a task |
| `POST` | `/api/v1/comments` | ✅ | Add comment |
| `PUT`  | `/api/v1/comments/:id` | ✅ | Edit comment (author only) |
| `DELETE` | `/api/v1/comments/:id` | ✅ | Delete comment (author only) |
| `GET`  | `/api/v1/health` | ❌ | Health check |

---

## Local Setup

### Prerequisites
- Node.js v18 or later
- A running MySQL instance (local XAMPP / WAMP, or a TiDB Cloud free tier)

### 1. Clone & Install

```bash
git clone https://github.com/sazzad-ahmad/student-collab-hub.git
cd student-collab-hub
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_collab_hub
DB_SSL=false              # set to true for TiDB Cloud / any cloud MySQL

# Session
SESSION_SECRET=change_this_to_a_long_random_string
SESSION_NAME=connect.sid
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTP_ONLY=true
SESSION_COOKIE_SAME_SITE=lax
SESSION_MAX_AGE=86400000

# JWT
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d

# CORS (frontend origin)
CLIENT_ORIGIN=http://localhost:3000
```

### 3. Create the Database Schema

Run the schema SQL against your MySQL instance:

```bash
# Using the MySQL CLI
mysql -u root -p < database/schema.sql
```

Or paste the contents of [`database/schema.sql`](./database/schema.sql) into your MySQL client (TablePlus, DBeaver, phpMyAdmin, etc.).

### 4. Start the Development Server

```bash
npm run dev      # nodemon — auto-restarts on file changes
# or
npm start        # plain node
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deploying to Vercel + TiDB Cloud

### TiDB Cloud (database)
1. Create a free **TiDB Cloud Serverless** cluster at [tidbcloud.com](https://tidbcloud.com).
2. Copy the connection details (host, port, user, password, database name).
3. Run `database/schema.sql` via the TiDB Cloud SQL editor or any MySQL client pointed at your cluster.

### Vercel (hosting)
1. Push this repository to GitHub.
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Add all required environment variables in **Project → Settings → Environment Variables**:

| Variable | Example value |
|----------|--------------|
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | `4000` |
| `DB_USER` | `your_tidb_user` |
| `DB_PASSWORD` | `your_tidb_password` |
| `DB_NAME` | `student_collab_hub` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | *(long random string)* |
| `JWT_EXPIRES_IN` | `7d` |
| `SESSION_SECRET` | *(long random string)* |
| `SESSION_COOKIE_SECURE` | `true` |
| `SESSION_COOKIE_SAME_SITE` | `none` |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` |
| `NODE_ENV` | `production` |

4. Deploy — Vercel automatically picks up `vercel.json` and routes `/api/*` to the Express serverless function and everything else to the `public/` static files.

---

## License

MIT © 2024 Student Collab Hub
