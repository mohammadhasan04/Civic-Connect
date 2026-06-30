<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285f4?logo=google" alt="Gemini AI" />
</p>

# 🏛️ Civic Connect — Smart Civic Complaint Management Platform

**Civic Connect** is a full-stack, AI-powered civic complaint management system built for **Bhatkal Taluk Administration**. It enables citizens to file, track, and resolve civic issues with full transparency, SLA tracking, role-based dashboards, and AI-powered analysis.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Set Up Supabase](#3-set-up-supabase)
  - [4. Configure Environment Variables](#4-configure-environment-variables)
  - [5. Run Database Migrations](#5-run-database-migrations)
  - [6. Start the Development Server](#6-start-the-development-server)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [User Roles & Access](#-user-roles--access)
- [API Routes](#-api-routes)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [License](#-license)

---

## ✨ Features

### 🧑‍💼 Citizen Features
- **File Complaints** — Submit civic issues with title, description, category, location (map pin), and image uploads (up to 3 images)
- **Track Complaints** — Real-time status tracking with timeline view (NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED)
- **Notifications** — Get notified on status changes, assignments, SLA warnings, and resolutions
- **Rate & Review** — Rate resolved complaints and provide feedback
- **Profile Management** — Update personal info, notification preferences, and language settings
- **Privacy Controls** — View and manage citizen privacy settings

### 👨‍💻 Department Staff Features
- **Complaint Queue** — View and manage assigned complaints
- **Status Updates** — Update complaint status with notes
- **Add Comments** — Internal and public comments on complaints
- **Priority Management** — Set complaint priority (LOW, NORMAL, HIGH, CRITICAL)

### 🏢 Ward Supervisor Features
- **Ward Dashboard** — Overview of all complaints in the assigned ward
- **Complaint Management** — Assign, escalate, and resolve complaints
- **Staff Oversight** — Monitor department staff performance

### 🏛️ City Admin (Taluk Admin) Features
- **Analytics Dashboard** — Comprehensive charts and stats (category distribution, ward performance, SLA compliance)
- **Department Management** — Create and manage departments
- **Category Management** — Configure complaint categories with SLA thresholds
- **Ward Management** — Manage ward boundaries and contacts
- **User Management** — Create/manage staff accounts and roles
- **Info Requests** — Handle citizen information access requests

### 🔑 Super Admin Features
- **System Configuration** — Platform-wide settings and branding
- **Audit Log** — Full system audit trail with actor, action, and timestamps
- **Taluk Admin Management** — Onboard and manage city administrators
- **Cross-Taluk Oversight** — View all complaints across the platform

### 🤖 AI-Powered Features
- **Smart Description Enhancement** — Gemini AI refines complaint descriptions for clarity
- **Auto-Routing** — AI suggests the correct department based on complaint content
- **Image Verification** — AI confidence scoring for uploaded evidence

### 🌐 Platform Features
- **Public Transparency Dashboard** — Open data on complaint resolution rates, SLA compliance, and department performance
- **Interactive Map** — Leaflet-based map showing complaint locations with status-colored markers
- **SLA Tracking** — Automatic response and resolution deadline enforcement with breach notifications
- **Dark/Light Mode** — Full theme support with `next-themes`
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Row-Level Security** — Supabase RLS policies ensure data access control at the database level
- **Security Headers** — CSP, HSTS, X-Frame-Options, and more

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS 3, Framer Motion (animations) |
| **UI Components** | Custom components with `class-variance-authority`, `lucide-react` icons |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth (email/password) |
| **Storage** | Supabase Storage (complaint images) |
| **AI** | Google Gemini API |
| **Maps** | React Leaflet + OpenStreetMap |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **State** | React Context + TanStack React Query |

---

## 📁 Project Structure

```
civic-connect/
├── public/                     # Static assets & PWA manifest
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # City Admin dashboard & management pages
│   │   ├── api/                # API routes (serverless functions)
│   │   ├── auth/               # Auth callback handler
│   │   ├── citizen/            # Citizen dashboard, complaints, profile
│   │   ├── forgot-password/    # Password reset flow
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── staff/              # Department staff dashboard
│   │   ├── superadmin/         # Super admin management pages
│   │   ├── supervisor/         # Ward supervisor dashboard
│   │   ├── transparency/       # Public transparency dashboard
│   │   ├── verify-email/       # Email verification page
│   │   ├── globals.css         # Global styles & design tokens
│   │   ├── layout.tsx          # Root layout (providers, fonts)
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── complaint/          # Complaint-related components
│   │   ├── dashboard/          # Dashboard widgets & cards
│   │   ├── layout/             # Sidebar, Navbar, SearchBar
│   │   ├── map/                # Leaflet map components
│   │   └── profile/            # Profile settings component
│   ├── lib/
│   │   ├── supabase/           # Supabase client (browser & server)
│   │   ├── auth-context.tsx    # Auth provider & hooks
│   │   ├── complaints-store.tsx # Complaint data hooks (React Query)
│   │   ├── constants.ts        # Status colors, role config, SLA thresholds
│   │   ├── types.ts            # TypeScript type definitions
│   │   └── utils.ts            # Utility functions
│   └── middleware.ts           # Auth middleware (route protection)
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql     # Database schema (tables, types, triggers)
│       ├── 0002_rls.sql        # Row-Level Security policies
│       └── 0003_seed_and_admin.sql  # Seed data & admin account setup
├── .env.example                # Environment variables template (blank)
├── .eslintrc.json
├── next.config.mjs             # Next.js config (security headers, CSP)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 📌 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** ≥ 18.x — [Download](https://nodejs.org/)
- **npm** ≥ 9.x (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)
- **Supabase Account** — [Sign up free](https://supabase.com/)
- **Google Gemini API Key** — [Get API Key](https://aistudio.google.com/apikey)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/mohammadhasan04/Civic-Connect.git
cd Civic-Connect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a **new project**
2. Note down your:
   - **Project URL** (e.g., `https://xxxxxxxxxxxx.supabase.co`)
   - **Anon Key** (public)
   - **Service Role Key** (secret — found in Settings → API)

### 4. Configure Environment Variables

Copy the `.env.example` file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Run Database Migrations

Go to your Supabase project → **SQL Editor** and run the migration files **in order**:

1. **`supabase/migrations/0001_schema.sql`** — Creates all tables, types, triggers, and indexes
2. **`supabase/migrations/0002_rls.sql`** — Sets up Row-Level Security policies
3. **`supabase/migrations/0003_seed_and_admin.sql`** — Seeds categories, departments, wards, and creates the admin account

> **⚠️ Important:** Run them in order (0001 → 0002 → 0003). Each migration depends on the previous one.

### 6. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> The dev server uses **Turbopack** for fast refresh (`next dev --turbo`).

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | ✅ |

> **🔒 Security Note:** Never commit `.env.local` to version control. It is already in `.gitignore`.

---

## 🗄️ Database Schema

The database uses PostgreSQL with the following core tables:

| Table | Description |
|-------|-------------|
| `profiles` | User profiles linked to Supabase Auth (citizen, staff, admin roles) |
| `complaints` | Core complaints with ticket IDs, status, priority, SLA deadlines |
| `categories` | Complaint categories with department routing & SLA config |
| `departments` | Government departments |
| `wards` | Ward/area divisions of Bhatkal Taluk |
| `complaint_media` | Image attachments for complaints |
| `complaint_status_history` | Status change timeline |
| `complaint_comments` | Public/internal comments |
| `complaint_notes` | Internal staff notes |
| `notifications` | User notifications |
| `escalations` | Complaint escalation records |
| `sla_breaches` | SLA breach tracking |
| `system_audit_log` | Full audit trail |
| `system_settings` | Platform configuration |

### Key Database Features:
- **Auto-generated Ticket IDs** — Format: `CC-YYYY-000001` (via trigger)
- **Status State Machine** — Enforced valid transitions (NEW → ASSIGNED → IN_PROGRESS → ...)
- **Updated Timestamps** — Automatic `updated_at` triggers
- **Row-Level Security** — Citizens only see their own data; staff see assigned complaints

---

## 👥 User Roles & Access

| Role | Access Level | Dashboard Route |
|------|-------------|-----------------|
| **Citizen** | File complaints, track own issues, rate resolutions | `/citizen/dashboard` |
| **Department Staff** | Manage assigned complaints, update status | `/staff/dashboard` |
| **Ward Supervisor** | Oversee ward complaints, assign staff | `/supervisor/dashboard` |
| **City Admin (Taluk Admin)** | Full management: analytics, departments, categories, users, wards | `/admin/dashboard` |
| **Super Admin** | Platform-wide config, audit logs, taluk admin management | `/superadmin/dashboard` |

---

## 🔌 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/callback` | GET | Supabase auth callback handler |
| `/api/complaints` | GET/POST | List/create complaints |
| `/api/complaints/[id]` | GET/PATCH | Get/update a specific complaint |
| `/api/ai/enhance` | POST | AI description enhancement (Gemini) |
| `/api/admin/*` | Various | Admin management endpoints |

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Add environment variables in Vercel's dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. Deploy!

### Build for Production

```bash
npm run build
npm start
```

---

## 📸 Screenshots

> Screenshots can be added here after deployment.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is built for **Bhatkal Taluk Administration** as a civic technology initiative.

---

<p align="center">
  Made with ❤️ for Bhatkal
</p>
