# Student Collab Hub 🎓🚀

A modern, full-stack student task management and team collaboration hub. Designed for students and project teams to collaborate seamlessly with kanban task workflows, role management, project discussions, and activity tracking—wrapped in a sleek dark-slate SaaS interface.

---

## ✨ Features

- **📊 Interactive Kanban Board**: Drag, sort, and organize tasks across `To Do`, `In Progress`, and `Done` states with priority tags (`Low`, `Medium`, `High`, `Critical`).
- **👥 Project Collaboration**: Invite project members by email, manage roles (`Owner`, `Lead`, `Member`), and track team contributions.
- **💬 Task Discussions & Comments**: Threaded comments on individual tasks to keep project discussions organized and actionable.
- **📈 Pro Dashboard Summary**: Real-time stats bar reporting Total Projects, Total Tasks, and Active Collaborations dynamically.
- **🎨 Unified Sleek Dark Theme**: Cohesive dark slate UI aesthetic (`#0f172a` slate palette) across the entire application with crisp focus rings, glowing hover interactions, and responsive mobile sidebar.
- **🔐 Dual Authentication**: Robust user authentication supporting both stateless **JWT Bearer tokens** and stateful **Express sessions** backed by MySQL.
- **🛡️ Production Ready**: Pre-configured with Helmet security headers, CORS, rate-friendly pagination, input validation via `express-validator`, and automated SSL support for cloud databases.

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MySQL](https://www.mysql.com/) / [TiDB Cloud Serverless](https://tidbcloud.com/)
- **Database Driver**: `mysql2/promise` with connection pooling and automated SSL negotiation
- **Authentication**: `jsonwebtoken` (JWT) & `bcryptjs` password hashing
- **Session Store**: `express-session` with `express-mysql-session`
- **Security & Validation**: `helmet`, `cors`, `express-validator`

### Frontend
- **Markup**: Semantic HTML5 with accessibility attributes (`aria-*`)
- **Styles**: Modern Vanilla CSS3 with CSS custom properties (Design Tokens), Flexbox, and CSS Grid
- **Scripts**: Modular Vanilla JavaScript (ES6+ Modules)
- **Icons**: Optimized inline SVG icons

---

## 📁 Project Structure

```
student-collab-hub/
├── config/                  # Configuration modules
│   ├── database.js          # MySQL pool connection with auto-SSL
│   ├── env.js               # Validated environment variables
│   └── session.js           # MySQL-backed session store
├── database/
│   └── schema.sql           # Database schema & indexes
├── public/                  # Frontend static assets
│   ├── css/
│   │   └── style.css        # Unified dark slate design system
│   ├── js/
│   │   ├── components/      # UI components (toast notifications, etc.)
│   │   ├── pages/           # Page-level scripts (auth, dashboard, project)
│   │   └── utils/           # API fetch wrapper with token handling
│   ├── dashboard.html       # Projects dashboard & stats overview
│   ├── index.html           # Authentication portal (Sign In / Register)
│   └── project.html         # Interactive Kanban project board
├── scripts/
│   ├── init-db.js           # Database initialization utility
│   └── verify-api.js        # End-to-end API verification suite
├── src/
│   ├── controllers/         # Request handlers (auth, project, task, comment)
│   ├── middleware/          # Auth guards & error handlers
│   ├── routes/              # Express API route definitions (/api/v1/*)
│   ├── utils/               # Response formatters & helpers
│   ├── validators/          # Express-validator schemas
│   ├── app.js               # Serverless Express app export
│   └── server.js            # Local server entry point (app.listen)
├── .env.example             # Environment variable template
├── vercel.json              # Vercel deployment configuration
└── package.json
```

---

## 💻 Local Setup Guide

### 1. Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **MySQL Server** (via XAMPP, Docker, or native MySQL installation)
- **Git**

### 2. Clone and Install
```bash
git clone https://github.com/<your-username>/student-collab-hub.git
cd student-collab-hub
npm install
```

### 3. Database Setup (Local XAMPP / MySQL)
1. Start Apache and MySQL from the XAMPP Control Panel.
2. Open phpMyAdmin or your MySQL CLI:
   ```sql
   CREATE DATABASE student_collab_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the schema:
   ```bash
   mysql -u root -p student_collab_hub < database/schema.sql
   ```
   *(Or run `npm run db:init` if configured).*

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your local database credentials:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=student_collab_hub
DB_SSL=false

SESSION_SECRET=dev_secret_change_in_production_1234567890
JWT_SECRET=dev_jwt_secret_change_in_production_abcdefghijklmnopqrstuvwxyz
JWT_EXPIRES_IN=7d

CLIENT_ORIGIN=http://localhost:3000
```

### 5. Start the Application
```bash
npm start
# Or for development with live reload:
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## ☁️ Production Deployment (Vercel + TiDB Cloud)

### Step 1: Provision TiDB Cloud Serverless MySQL (Free)
1. Sign up at [TiDB Cloud](https://tidbcloud.com/).
2. Create a free **Serverless Cluster**.
3. In the cluster console, click **Connect**:
   - Choose **Connect with: Node.js (mysql2)**.
   - Note your `Host`, `Port` (typically `4000`), `User`, and `Password`.
4. Open the SQL Editor in TiDB Cloud and run the contents of [`database/schema.sql`](database/schema.sql) to initialize the tables (`users`, `projects`, `project_members`, `tasks`, `task_comments`, `sessions`).

### Step 2: Deploy to Vercel
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: prepare Student Collab Hub for Vercel deployment"
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Import your GitHub repository.
4. In **Environment Variables**, configure:
   | Key | Value | Description |
   | --- | --- | --- |
   | `NODE_ENV` | `production` | Enables production mode & automatic SSL |
   | `DB_HOST` | `gateway01.us-east-1.prod.aws.tidbcloud.com` | TiDB Cloud Cluster Host |
   | `DB_PORT` | `4000` | TiDB Cloud MySQL Port |
   | `DB_USER` | `<prefix>.root` | TiDB Cloud Username |
   | `DB_PASSWORD` | `<cluster-password>` | TiDB Cloud Password |
   | `DB_NAME` | `student_collab_hub` | Database Name |
   | `DB_SSL` | `true` | Enforces SSL for cloud database |
   | `SESSION_SECRET` | `<random-32-char-string>` | Strong secret for express-session |
   | `JWT_SECRET` | `<random-64-char-string>` | Strong secret for JWT signing |
   | `CLIENT_ORIGIN` | `https://<your-project>.vercel.app` | Production app URL for CORS |
5. Click **Deploy**. Vercel will automatically build the serverless functions (`src/app.js`) and publish the static frontend (`public/**`).

---

## 🔌 API Endpoints Reference

All endpoints are prefixed with `/api/v1`:

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/health` | Server health check | No |
| `POST` | `/auth/register` | Register a new student account | No |
| `POST` | `/auth/login` | Authenticate & retrieve JWT / session | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes |
| `POST` | `/auth/logout` | Terminate session | Yes |
| `GET` | `/projects` | List user projects (paginated) | Yes |
| `POST` | `/projects` | Create a new project | Yes |
| `GET` | `/projects/:projectId` | Fetch single project & team members | Yes |
| `PATCH` | `/projects/:projectId` | Update project details (Owner only) | Yes |
| `DELETE` | `/projects/:projectId` | Delete project (Owner only) | Yes |
| `POST` | `/projects/:projectId/members` | Add project member by email | Yes |
| `DELETE` | `/projects/:projectId/members/:userId` | Remove project member | Yes |
| `GET` | `/tasks/project/:projectId` | Get all tasks for a project | Yes |
| `POST` | `/tasks` | Create a task | Yes |
| `PATCH` | `/tasks/:taskId/status` | Update task status (`todo`, `in_progress`, `done`) | Yes |
| `DELETE` | `/tasks/:taskId` | Delete a task | Yes |
| `GET` | `/comments/task/:taskId` | Get comments for a task | Yes |
| `POST` | `/comments` | Add a comment to a task | Yes |
| `DELETE` | `/comments/:commentId` | Delete a comment | Yes |

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
