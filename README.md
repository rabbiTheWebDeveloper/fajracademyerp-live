# Fajr Academy ERP 🎓

Enterprise Educational Resource Planning (ERP) and Learning Management System (LMS) for **Fajr Academy**, built with Next.js 16 (Turbopack), TypeScript, Tailwind CSS v4, and MongoDB.

---

## 💡 What Solution Does This Project Provide?

| Operational Problem | Fajr Academy ERP Solution |
| :--- | :--- |
| **Scattered Class Links & Attendance Fraud** | Automated Google Meet link creation via Calendar API + real-time attendance logs |
| **Complex & Error-Prone Teacher Payroll** | Automated hourly teaching salary calculation with 1-click payslips |
| **Teacher Inactivity & Lack of Motivation** | Gamified "Gems" reward system, milestone tiers & public leaderboard |
| **Remote Staff Accountability** | Daily work reports, clock-in/out attendance & activity tracker |
| **Tuition Fee Tracking & Fake Certificates** | Student payment ledger, PDF invoices & public authenticity verification (`/verify`) |
| **Slow Escalation to Leadership** | Direct CEO escalation line with instant Telegram notifications |
| **Multi-Role Security Risks** | Next.js Edge Proxy RBAC with granular dynamic permissions |

---

## 🌟 Key Portals & Features

- **👑 Super Admin & Admin Dashboard (`/admin`)**: Complete student CRM, teacher management, salary calculations, finance/billing, role & permission engine, system health & audit logs.
- **👨‍🏫 Teacher Portal (`/teacher`)**: Class schedule, auto-generated Google Meet sessions, student attendance, learning materials, monthly salary breakdown, and Gamification (Gems & Leaderboard).
- **🎓 Student Portal (`/student`)**: Live class links, schedule, payment receipts/invoices, certificates, and course materials.
- **💼 Staff Operations Portal (`/staff`)**: Daily work reporting, check-in/out attendance, leave management, activity tracker, and salary slips.
- **🛡️ Public Member & Certificate Verification (`/verify`)**: Public verification of student certificates and staff credentials.

---

## 📖 Full Documentation

Detailed system documentation is available in [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md), covering:
- Architecture & Role-based Access Control (Proxy middleware)
- All 35 Mongoose Data Models
- 70+ REST API Routes Reference
- External Integrations (Google Calendar OAuth2 for Meet, Telegram CEO bot, Pusher, Nodemailer)
- Environment Variables setup & deployment instructions

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server with Turbopack
pnpm run dev

# Build for production
pnpm run build
```

