# 📘 Fajr Academy ERP — Comprehensive System Documentation

> **Version**: 1.0.0  
> **Framework**: Next.js 16 (App Router & Turbopack)  
> **Database**: MongoDB (Mongoose ODM)  
> **Platform URL**: `https://app.fajracademy.io`

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problems & Solutions Provided (Value Proposition)](#2-problems--solutions-provided-value-proposition)
3. [Technology Stack & Why Each Technology is Used](#3-technology-stack--why-each-technology-is-used)
4. [System Architecture & Portals](#4-system-architecture--portals)
5. [Authentication, Security & Proxy Flow](#5-authentication-security--proxy-flow)
6. [Database Architecture & Data Models](#6-database-architecture--data-models)
7. [Core Modules & Operational Features](#7-core-modules--operational-features)
8. [API Route Reference](#8-api-route-reference)
9. [External Integrations](#9-external-integrations)
10. [Environment Variables & Configuration](#10-environment-variables--configuration)
11. [Local Development, Build & Deployment](#11-local-development-build--deployment)

---

## 1. Executive Summary

**Fajr Academy ERP** is an enterprise-grade Educational Resource Planning (ERP) and Learning Management System (LMS) engineered for modern Islamic and academic educational institutions. It delivers role-based portals for **Super Admins, Admins, Teachers, Students, and Staff Members**, unifying academic scheduling, automated payroll, real-time Google Meet class generation, teacher performance gamification (Gems & Leaderboard), daily activity tracking, and CEO escalation workflows into a single cohesive platform.

---

## 2. Problems & Solutions Provided (Value Proposition)

Fajr Academy ERP solves critical administrative, operational, financial, and academic challenges faced by online and hybrid educational institutions:

```
+-------------------------------------------------------------+---------------------------------------------------------------+
|                      THE PROBLEM                            |                       THE ERP SOLUTION                        |
+-------------------------------------------------------------+---------------------------------------------------------------+
| 1. Disorganized Class Links & Attendance Fraud              | Automated Google Meet Link Generation + Verified Logs         |
| 2. Error-Prone & Time-Consuming Teacher Payroll             | Automated Class-Hour-to-Salary Calculator with Payslips       |
| 3. Low Teacher Motivation & Lack of Quality Control         | Gamified "Gems" Rewards System + Real-Time Leaderboards       |
| 4. Remote Staff Inactivity & Blind Management               | Staff Check-in/out + Daily Work Reports + Activity Tracker    |
| 5. Tuition Payment Leakage & Fake Certificates              | Automated PDF Billing + Public Verification Portal (/verify)  |
| 6. Bureaucratic Delays on Urgent Teacher/Staff Issues       | CEO Direct Line with Instant Telegram Push Notifications     |
| 7. Security Vulnerabilities & Unrestricted Role Access      | Edge Proxy RBAC + Granular Dynamic Permission Engine          |
+-------------------------------------------------------------+---------------------------------------------------------------+
```

### Detailed Breakdown of Solutions

#### 🎯 1. Problem: Scattered Class Links & Manual Attendance
* **Pain Point**: Teachers and students frequently lose class meeting links across WhatsApp/Telegram groups. Manual attendance sheets in Excel lead to errors, lost data, and attendance fraud.
* **The Solution**: 
  - **Automated Google Calendar Integration**: Generates official Google Meet links automatically via Google Calendar OAuth2 when classes are scheduled.
  - **1-Click Class Access**: Students and teachers simply click "Join Class" from their dedicated portals.
  - **Real-Time Attendance Recording**: Class completion, student presence, and duration are recorded directly into MongoDB and tied to academic history.

---

#### 💰 2. Problem: Complex Hourly Payroll & Payment Disputes
* **Pain Point**: Calculating monthly salaries for dozens of teachers who have variable class hours, hourly rates, student counts, and bonus structures takes days of manual accounting and creates disputes.
* **The Solution**:
  - **Automated Salary Calculation**: System automatically computes teacher salaries by multiplying verified attended class hours by their assigned tier rate (`teacherCategory`).
  - **Transparent Salary Breakdown**: Teachers can inspect their completed classes, hours taught, student attendances, and computed salary in real-time on their `/teacher/salary` dashboard.
  - **1-Click PDF Pay Slips & Admin Reports**: Generates downloadable salary reports and transaction records for accounting.

---

#### 🏆 3. Problem: Teacher Inactivity & Lack of Performance Recognition
* **Pain Point**: In online academies, monitoring teacher performance, student retention, and motivating teachers to deliver high-quality classes is notoriously difficult.
* **The Solution**:
  - **Teacher Gems Reward System**: Teachers automatically earn "Gems" for on-time class completion, timely report submissions, positive student reviews, and student milestones.
  - **Tier Progression**: Gem points advance teachers through tiers (*Bronze ➔ Silver ➔ Gold ➔ Platinum*), unlocking higher hourly pay rates.
  - **Live Leaderboard**: Transparent ranking fosters healthy competition and publicly celebrates top educators.

---

#### 💼 4. Problem: Staff Accountability & Remote Workforce Management
* **Pain Point**: Remote and onsite non-teaching staff (Marketing, Sales, Business Development, Student Support, CAM) often lack clear daily accountability, structured work logs, and leave tracking.
* **The Solution**:
  - **Staff Attendance Tracking**: Digital clock-in / clock-out system with work hour calculation.
  - **Daily Work Reports**: Staff submit daily summaries, targets met, and operational roadblocks before sign-off.
  - **Activity Tracker**: Granular task and time allocation logging for internal auditing.
  - **Leave Management Workflow**: Leave applications submitted online with instant approval/rejection statuses.

---

#### 💳 5. Problem: Tuition Tracking, Invoice Issuance & Certificate Forgery
* **Pain Point**: Collecting tuition fees, verifying bKash/Nagad/Bank transactions, issuing receipts, and preventing counterfeit academic certificates is labor-intensive.
* **The Solution**:
  - **Tuition & Payment Ledger**: Tracks paid, partial, and overdue student tuition fees with transaction reference logging.
  - **Automated PDF Invoice Generation**: Students and admins can instantly download branded tuition receipts.
  - **Public Verification Portal (`/verify`)**: Anyone can verify student certificates and staff credentials by entering an ID or scanning a QR code, ensuring institutional integrity.

---

#### ⚡ 6. Problem: Slow Escalation to Leadership
* **Pain Point**: Critical student complaints or urgent teacher concerns get buried in bureaucratic ticketing systems.
* **The Solution**:
  - **CEO Direct Line (`/teacher/ceo-request`, `/ceo-requests`)**: Dedicated high-priority escalation channel.
  - **Instant Telegram Alerting**: Dispatches instant push notifications directly to the CEO's private Telegram chat, ensuring same-day response times for critical matters.

---

#### 🛡️ 7. Problem: Data Security & Cross-Role Access Vulnerabilities
* **Pain Point**: Risk of student data exposure, unauthorized grade/salary modifications, or staff accessing admin settings.
* **The Solution**:
  - **Edge-Level Proxy Protection (`src/proxy.ts`)**: Validates JWT tokens at the Next.js edge runtime before requests even touch the page components.
  - **Dynamic Permission Engine**: Fine-grained permissions stored in `RoleModel` allow admins to customize view/edit privileges for specific roles (e.g. Sales staff cannot access teacher salary reports).
  - **Full Audit Logging (`audit-log-model`)**: Records every critical action (login, record creation, deletion, permission change) with IP address and timestamps.

---

## 3. Technology Stack & Why Each Technology is Used

Fajr Academy ERP is engineered with a modern, high-performance tech stack carefully selected for speed, scalability, type safety, and seamless real-time operations.

```
+---------------------------+-----------------------------------+---------------------------------------------------------------+
|       Technology          |             Category              |                       Why We Use It                           |
+---------------------------+-----------------------------------+---------------------------------------------------------------+
| Next.js 16 (Turbopack)    | Full-Stack Meta Framework         | Fast compilation, Unified Full-Stack API, App Router & SSR    |
| React 19                  | Frontend UI Library               | Declarative UI, Concurrent Rendering & Fast State Transitions  |
| TypeScript 5.9            | Static Typing & Reliability       | End-to-end type safety across 144+ routes and 35 data models  |
| Tailwind CSS v4           | Utility-First Styling             | Glassmorphism aesthetics, responsive layouts & light/dark mode|
| MongoDB Atlas & Mongoose 9| NoSQL Database & ODM              | Flexible schema for nested arrays (batches, attendance, logs) |
| JWT (jose + jsonwebtoken) | Authentication & Edge RBAC        | Stateless secure httpOnly cookie sessions + Edge verification |
| Google Calendar API       | Live Class Automation             | Automated Google Meet link creation with zero manual work     |
| Telegram Bot API          | Executive Alerts                  | Instant CEO push notifications for high-priority requests     |
| Pusher Channels           | Real-Time WebSockets              | Instant live alerts and notifications across all portals      |
| Recharts                  | Interactive Visual Analytics      | Live revenue graphs, attendance charts & performance trends   |
| jsPDF & xlsx              | Document & Spreadsheet Engine     | 1-click PDF invoices, payslips & bulk Excel student import    |
| Nodemailer & Gmail SMTP   | Transactional Email Engine        | Reliable delivery of welcome letters, receipts & alerts      |
| Cloudinary & ImageKit     | Global Media CDN                  | Fast media delivery, avatar uploads & certificate rendering   |
| PWA (Service Workers)     | Progressive Web App               | Installable on mobile/desktop with offline asset caching      |
+---------------------------+-----------------------------------+---------------------------------------------------------------+
```

---

### Detailed Rationale for Core Technologies

#### ⚡ 1. Next.js 16 (App Router, Turbopack, Server Components & Route Handlers)
* **Why We Use It**: 
  - **Single Unified Codebase**: Combines the React frontend UI and 70+ backend Node.js RESTful API endpoints into one repository.
  - **Turbopack Compiler**: Cuts local build and hot-reload times by over 60%, delivering lightning-fast developer feedback.
  - **Server Components & Streaming**: Delivers fast initial page loads (First Contentful Paint) while fetching database records on the server.
  - **Edge Proxy Middleware (`src/proxy.ts`)**: Enables zero-latency authentication checks and role-based redirects at the edge before rendering pages.

#### ⚛️ 2. React 19
* **Why We Use It**: 
  - Powers modern, interactive client components with smooth animations and responsive feedback.
  - Optimistic UI updates ensure forms, attendance submissions, and gem awards feel instantaneous to the user.

#### 🛡️ 3. TypeScript 5.9
* **Why We Use It**: 
  - Eliminates common runtime bugs (e.g. `undefined` role redirects, missing payload fields) across a massive codebase with 144+ pages and 35 schemas.
  - Autocomplete and type definitions speed up feature development and refactoring.

#### 🎨 4. Tailwind CSS v4 & Lucide Icons
* **Why We Use It**: 
  - **Zero Bloat**: Generates pure, minimal CSS on-demand, keeping bundle sizes small.
  - **Rich Aesthetics**: Enables modern glassmorphic styling (`backdrop-blur-md`, subtle gradients, brand navy palettes) and instant Dark/Light mode switching.
  - **Lucide Icons**: Comprehensive, consistent icon library used across all 4 role portals.

#### 🍃 5. MongoDB Atlas & Mongoose 9 ODM
* **Why We Use It**: 
  - **Flexible Document Structure**: Online academies require complex, nested data structures (e.g. dynamic class schedules, nested attendance records, variable permission arrays) that are difficult to manage in rigid relational tables.
  - **High Query Performance**: Fast indexing on user emails, student IDs, teacher categories, and transaction hashes.
  - **Atlas Cloud Scalability**: High availability, automatic backups, and seamless scaling as student enrollment grows.

#### 🔐 6. JWT (`jose` at Edge + `jsonwebtoken` in Node) & `bcryptjs`
* **Why We Use It**: 
  - **Stateless & Scalable**: Eliminates server-side session stores, enabling instant verification across serverless functions.
  - **`jose` for Edge Runtime**: High-performance, Web Crypto API-compliant JWT verification inside `src/proxy.ts`.
  - **`httpOnly` Cookie Security**: Prevents XSS attacks by storing tokens in secure cookies inaccessible to malicious client scripts.

#### 📅 7. Google Calendar OAuth2 API (`googleapis`)
* **Why We Use It**: 
  - Automates the creation of official Google Meet conference links whenever a teacher schedules a class.
  - Eliminates human error, lost meeting links, and the need for teachers to manually generate and share links.

#### 🤖 8. Telegram Bot API
* **Why We Use It**: 
  - Direct bridge between the ERP web application and executive mobile devices.
  - When a teacher or staff member submits a high-priority CEO request, the CEO receives an instant Telegram push notification with full details.

#### 📡 9. Pusher Channels
* **Why We Use It**: 
  - Real-time WebSocket event broadcasting for instant notifications, live attendance updates, and broadcast notice alerts across active browser tabs.

#### 📊 10. Recharts
* **Why We Use It**: 
  - Declarative, SVG-based charting library tailored for React.
  - Powers interactive revenue graphs, hourly visitor stats, monthly salary distributions, and teacher performance metrics.

#### 📄 11. jsPDF, jsPDF-AutoTable & xlsx
* **Why We Use It**: 
  - **jsPDF & jsPDF-AutoTable**: Client-side and server-side generation of branded PDF tuition receipts, certificate printouts, and monthly salary slips.
  - **xlsx**: Allows administrators to import hundreds of student records in bulk via Excel spreadsheets, and export accounting ledgers with 1 click.

#### ✉️ 12. Nodemailer & Gmail SMTP
* **Why We Use It**: 
  - Sends automatic transactional emails: student enrollment welcome letters, payment receipts, password reset links, and notice board broadcasts.

#### 🖼️ 13. Cloudinary & ImageKit
* **Why We Use It**: 
  - Cloud-based storage and CDN delivery for student profile pictures, teacher verification documents, and learning material attachments with automatic optimization.

#### 📱 14. Progressive Web App (PWA & Service Worker)
* **Why We Use It**: 
  - Allows students, teachers, and staff to install the ERP on their mobile phones (Android/iOS) and Windows/Mac desktops like a native app.
  - Service worker caches static assets to ensure reliable performance on slow network connections.

---

## 4. System Architecture & Portals

The application uses Next.js Route Groups `(route-group)` to enforce distinct layout boundaries, themes, and navigation systems per user role:

```
src/app/
├── (auth)/             # Authentication views (/login, /signup, /forgot-password)
├── (dashboard)/        # Administrative ERP Dashboard (/admin, /students, /teachers, etc.)
├── (teacher)/          # Teacher Portal (/teacher, /teacher/class, /teacher/salary)
├── (student)/          # Student LMS Portal (/student, /student/classes, /student/payments)
├── (staff)/            # Staff Operations Portal (/staff, /staff/attendance, /staff/payroll)
├── (public)/           # Public certificate & member verification (/verify)
├── api/                # 70+ RESTful Route Handlers
└── proxy.ts            # Next.js Edge Middleware for Role-Based Access Control
```

### Role Portals & Default Routes

| Role | Landing Route | Description |
| :--- | :--- | :--- |
| **`super-admin` / `admin`** | `/admin` | Complete institutional control, staff/student/teacher management, finances, system health, audit logs, and settings. |
| **`teacher`** | `/teacher` | Class schedules, attendance submission, learning materials, gem reward history, monthly salary breakdown, and direct line to CEO. |
| **`student`** | `/student` | Live class joining, payment invoices, certificates, class schedule, feedback submissions, and leaderboard. |
| **`staff` / Sub-roles** | `/staff` | Attendance check-in/out, leave requests, daily operational reports, activity tracking, and payroll slips. |
| **Public / Visitors** | `/verify` | Public student & teacher ID verification and certificate authenticity checks. |

*Sub-roles mapped to Staff Portal*: `sales`, `marketing`, `bd`, `cam`, `customer-executive`.

---

## 5. Authentication, Security & Proxy Flow

```
+----------------+       +-------------------+       +-----------------------+
|  User Request  | ----> |   src/proxy.ts    | ----> | Role-Based Portal     |
|   (Browser)    |       | (Next Middleware) |       | (/admin, /teacher...) |
+----------------+       +-------------------+       +-----------------------+
                                   |
                         (Invalid / No Token)
                                   v
                             Redirect /login
```

### 1. JWT Authentication
- When a user logs in via `/api/auth/login`, passwords are encrypted and checked with `bcryptjs`.
- If valid, a secure, `httpOnly`, `sameSite: "lax"` cookie named `auth_token` is generated (valid for 7 days).
- Super Password bypass support (`SUPER_PASSWORD`) enables emergency admin maintenance logins.

### 2. Edge Proxy Protection (`src/proxy.ts`)
- Public paths (`/login`, `/signup`, `/verify`, etc.) are open to all traffic.
- Unauthenticated users accessing protected paths are redirected to `/login` with an intact `?redirect=` parameter.
- Authenticated visits to `/` are automatically routed to the correct role portal (`/student`, `/teacher`, `/staff`, `/admin`).
- Token verification via `jose` ensures tamper-proof verification in the edge runtime and injects headers (`x-user-id`, `x-user-role`, `x-user-name`) for downstream server components.

### 3. Granular Permission Engine (`RoleModel`)
- System roles (`super-admin`, `admin`) possess wildcard `["*"]` permissions.
- Custom staff roles dynamically inherit permissions defined in the `RoleModel` collection in real time without requiring session invalidation.

---

## 6. Database Architecture & Data Models

The system contains **35 distinct Mongoose schemas** located in `src/model/`:

### A. Users & Identity
- **`user-model.js`**: Core administrative and custom staff user accounts.
- **`teacher-model.js`**: Teacher profiles, hourly salary rates, category tiers, qualifications, and bios.
- **`student-model.js`**: Student profiles, guardian info, assigned courses, batch IDs, and enrollment statuses.
- **`staff-model.js`**: Staff department, designation, salary configuration, and emergency contact details.
- **`role-model.js`**: Dynamic role names and array of granular permission strings.

### B. Academics & Classes
- **`course-model.js`**: Course syllabi, prerequisites, pricing, and active batch structures.
- **`class-model.js`**: Individual class sessions, topic tags, Google Meet links, class recordings, and student attendance records.
- **`schedule-model.js`**: Weekly recurring class schedules mapped to teachers and students.
- **`enrollment-model.js`**: Course enrollment records, status (`active`, `completed`, `cancelled`), and dates.
- **`assessment-model.js` & `submission-model.js`**: Quizzes, exams, and student submission scoring.

### C. Financial & Payroll
- **`payment-model.js`**: Student tuition payments, transaction IDs, payment gateways, and verification status.
- **`paymentInfo-model.js`**: Bank details, bKash/Nagad/Rocket account details for teachers and staff.
- **`teacherSalary-model.js`**: Monthly calculated teacher salaries based on completed class hours, bonuses, and deductions.
- **`staff-payroll-model.js`**: Monthly staff salary slips, base pay, overtime, and allowances.

### D. Operations, HR & Gamification
- **`staff-attendance-model.js`**: Daily staff check-in/out timestamps and work hours.
- **`staff-leave-model.js`**: Leave requests (sick, casual, emergency), approvals, and status tracking.
- **`staff-daily-report-model.js`**: Daily work summaries, targets achieved, and blockers submitted by staff.
- **`staff-activity-model.js`**: Granular task activity time tracking.
- **`teacher-gems-model.js`**: Teacher reward points ("Gems"), milestones, badges, and leaderboard rankings.
- **`teacher-category-model.js`**: Teacher tier ranks (Bronze, Silver, Gold, Platinum).

### E. Communications, Logs & Auditing
- **`audit-log-model.js`**: System-wide action audit trail (actor, action type, IP address, resource ID).
- **`ceo-request-model.js`**: Direct confidential requests sent from teachers/staff directly to the CEO (with Telegram notifications).
- **`support-ticket-model.js`**: Multi-threaded helpdesk tickets with status workflows.
- **`notice-model.js` & `announcement-model.js`**: Broadcast announcements with role targeting.
- **`visitorCount-model.js` & `visitorCountDay-model.js`**: Traffic analytics and visit counters.

---

## 7. Core Modules & Operational Features

### 🎓 1. Real-Time Google Meet Class Generation
- Integrated directly with **Google Calendar OAuth2 API** (`src/utlis/googleCalendar.js`).
- Automatically creates unique Google Meet conference links when a teacher schedules or launches a class, eliminating manual link sharing.

### 💎 2. Teacher Gamification & Leaderboard
- Teachers earn **Gems** for on-time class completion, timely report submissions, positive student feedback, and student retention.
- Tier advancement unlocks higher hourly salary rates and recognition badges.

### 💰 3. Automated Payroll & Billing
- **Teacher Salaries**: Computed automatically by multiplying total completed class hours from verified attendance logs by their assigned hourly rate.
- **Student Tuition Invoices**: Generates printable PDF receipts using `jspdf` and tracks due balances.

### 📱 4. CEO Direct Line & Telegram Alerts
- Teachers and staff can escalate critical concerns directly to executive leadership.
- Automatically dispatches instant alerts to the CEO's Telegram chat via `TELEGRAM_BOT_TOKEN`.

### 🛡️ 5. Public Member & Certificate Verification
- Anyone can verify the authenticity of student certificates or staff/teacher credentials at `/verify/[id]` without logging into the platform.

### ⚡ 6. Progressive Web App (PWA)
- Full PWA support with `manifest.json`, standalone viewport display, and service worker offline caching mechanisms.

---

## 8. API Route Reference

| Module | Endpoint | Methods | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | User authentication & JWT issuance |
| | `/api/auth/logout` | `POST` | Cookie destruction & session termination |
| | `/api/auth/me` | `GET` | Current user profile & live permissions |
| | `/api/auth/forgot-password`| `POST` | Password reset request |
| **Admin** | `/api/admin/system-health` | `GET` | Server resource & database health checks |
| | `/api/admin/audit-logs` | `GET`, `DELETE` | Audit trail inspection & retention cleanup |
| | `/api/admin/visitor-stats` | `GET` | Platform traffic metrics |
| | `/api/admin/ceo-requests` | `GET`, `PATCH` | Executive ticket management |
| | `/api/admin/monthly-salary-report`| `GET` | Aggregated institutional payroll reports |
| **Students**| `/api/students` | `GET`, `POST` | Student directory & registration |
| | `/api/students/export` | `GET` | Export students list to Excel/CSV |
| | `/api/students/import` | `POST` | Bulk import students via Excel/CSV |
| **Teachers**| `/api/teachers` | `GET`, `POST` | Teacher directory & onboarding |
| | `/api/teachers/category` | `GET`, `POST` | Teacher tiers and hourly rates |
| | `/api/teacher-portal/class`| `GET`, `POST` | Schedule & conduct classes |
| | `/api/teacher-portal/salary`| `GET` | Teacher salary calculation breakdown |
| | `/api/teacher-portal/gems` | `GET`, `POST` | Gem reward history and leaderboard |
| **Staff** | `/api/staff/attendance` | `GET`, `POST` | Staff check-in/check-out logs |
| | `/api/staff/daily-reports` | `GET`, `POST` | Daily task submission and reviews |
| | `/api/staff/leave` | `GET`, `POST`, `PATCH`| Leave application and manager approval |
| | `/api/staff/payroll` | `GET`, `POST` | Monthly staff pay slips |
| **Public** | `/api/verify` | `GET`, `POST` | Public certificate & member validation |

---

## 9. External Integrations

1. **Google Calendar API**: Automatic Google Meet link generation with OAuth2 refresh tokens.
2. **Telegram Bot API**: Real-time push alerts to executive chat channels for CEO requests.
3. **Pusher Channels**: Real-time WebSocket notifications across portals.
4. **Gmail SMTP**: Automated transactional emails (welcome emails, password resets, payment confirmations).
5. **Cloudinary / ImageKit**: CDN storage for profile avatars, documents, and learning resources.

---

## 10. Environment Variables & Configuration

Create a `.env` file in the root directory:

```env
# Application Base URL
APP_URL="https://app.fajracademy.io"

# Database Connection (MongoDB Atlas)
MONGODB_CONNECTION_STRING="mongodb+srv://<user>:<password>@cluster.mongodb.net/fajracademyerp?retryWrites=true&w=majority"

# Security & Secrets
JWT_SECRET="your_secure_random_jwt_secret_key"
SUPER_PASSWORD="your_emergency_master_password"

# Google Calendar OAuth2 (for Google Meet Link Generation)
GOOGLE_OAUTH_CLIENT_ID="xxxxxx.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-xxxxxx"
GOOGLE_OAUTH_REFRESH_TOKEN="1//xxxxxx"
GOOGLE_CLIENT_EMAIL="meet-generator@your-project.iam.gserviceaccount.com"

# Telegram Bot (CEO Notifications)
TELEGRAM_BOT_TOKEN="123456789:AAxxxxxx"
TELEGRAM_CEO_CHAT_ID="-100xxxxxxxxxx"

# Email Configuration (Nodemailer)
GMAIL_USER="support@fajracademy.io"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

# Real-Time WebSocket (Pusher)
PUSHER_KEY="xxxxxx"
PUSHER_CLUSTER="ap1"
PUSHER_SECRET="xxxxxx"
NEXT_PUBLIC_PUSHER_KEY="xxxxxx"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"

# Media Storage
IMAGEKIT_PUBLIC_KEY="public_xxxxxx"
IMAGEKIT_PRIVATE_KEY="private_xxxxxx"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_endpoint"
```

---

## 11. Local Development, Build & Deployment

### Prerequisites
- Node.js `20.x` or higher
- `pnpm` (recommended), `npm`, or `yarn`

### Setup & Run
```bash
# 1. Install dependencies
pnpm install

# 2. Database seeding (Optional initial data)
pnpm run seed

# 3. Start local development server (with Turbopack)
pnpm run dev

# 4. Production Build & Type Checking
pnpm run build

# 5. Start Production Server
pnpm run start
```

### Production Deployment
The application is fully optimized for deployment on **Vercel**, **Node.js VPS**, or **Docker Containers**. All 144 static and dynamic routes are verified and type-checked under Next.js Turbopack compiler.
