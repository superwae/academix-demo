# AcademiX LMS

A multi-tenant learning platform for **individual instructors**, **teaching institutions** (universities, bootcamps), and **employers** buying bulk training seats for their staff. Built as a full-stack demo with a production-shaped clean-architecture backend (.NET 8 / PostgreSQL / EF Core) and a React 19 + Vite frontend with full English/Arabic i18n (RTL) support.

---

## Table of contents
1. [What's in the box](#whats-in-the-box)
2. [Who the system is for](#who-the-system-is-for-roles--portals)
3. [Architecture](#architecture)
4. [Tech stack](#tech-stack)
5. [Running locally](#running-locally)
6. [Demo accounts](#demo-accounts)
7. [Configuration reference](#configuration-reference)
8. [Project layout](#project-layout)
9. [Key feature flows](#key-feature-flows)
10. [Further reading](#further-reading)

---

## What's in the box

- Full course lifecycle: authoring, sections, lessons, live sessions, assignments, exams, certificates.
- Three customer archetypes modelled first-class:
  - **Independent instructor** — subscribes personally, keeps most of every sale.
  - **Teaching Institution** — pools teachers under one subscription; platform + org + teacher revenue split.
  - **Employer** — buys bulk `CourseLicense` seats and assigns them to employees (no revenue paid out to the org).
- **Revenue split** resolved at purchase time (global default %, per-teacher override, per-org override). Live breakdown shown on the course form so the teacher knows what they earn before publishing. Monthly earnings view per teacher.
- **Course visibility** — public catalog vs. exclusive-to-org vs. "under org but still on public catalog".
- **Member invites** — expiring token emails, accept-invite flow creates the password and finalizes the account.
- **In-app + email support tickets** — auto-priority by category (Billing / Account → High, Feedback → Low), admin triage inbox, email notification to a configurable support address via Mailjet.
- **Full Arabic + RTL** end-to-end — UI text, server error messages, email templates. User-preferred language persists in the DB and follows them across devices.
- **Seat-pool subscriptions** for Teaching Institutions — one org plan covers every OrgTeacher's course quota.

---

## Who the system is for (roles & portals)

Platform-wide roles (stored on the user, set by admins):

| Role | Portal path | What they do |
|---|---|---|
| Student | `/student/*` | Browse catalog, enroll, take courses, message instructors, download certificates |
| Instructor | `/teacher/*` | Author courses + lessons, grade assignments, view earnings |
| Admin / SuperAdmin | `/admin/*` | Platform-wide management, users, courses, finance, support inbox, per-teacher platform-fee overrides |
| Accountant | `/accountant/*` | Read-only finance views |
| Secretary | `/secretary/*` | Calendar, directory, enrollment assistance |

Organization-scoped roles (stored on `OrganizationMember`):

| Org role | Available in | Scope |
|---|---|---|
| OrgAdmin | Both types | Full control of the org: members, billing, courses, licenses, settings |
| OrgManager | Employer | HR/training manager — can assign licenses, see compliance; can't change billing |
| OrgTeacher | Teaching Institution | Creates courses under the org; uses the pooled subscription seat quota |
| OrgEmployee | Employer | Learner owned by the org; only sees assigned courses |

A user can hold any combination (a Student who is also an OrgAdmin of a company they founded; an Instructor who is also an OrgTeacher under a bootcamp; etc.). The `Help` button in every portal header exposes "Switch to organization portal" whenever the signed-in user has at least one membership.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (Vite)                        │
│   React 19 + TypeScript + Tailwind + react-i18next              │
│   Route-level code splitting, Arabic/English, RTL-aware layout  │
│                         :5174 / :5177                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │  /api/* /hubs/* /health  (proxied by Vite)
┌──────────────────────▼──────────────────────────────────────────┐
│                       .NET 8 API (Kestrel :5261)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API          controllers + versioning + auth + i18n      │  │
│  │  Application  services, DTOs, Result<T>, .resx per service│  │
│  │  Domain       entities + enums + BaseEntity               │  │
│  │  Infrastructure EF configs, migrations, seeders, Lahza,   │  │
│  │                 Mailjet, SignalR                          │  │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────────────┬───────┘
              │                                           │
   ┌──────────▼──────────┐                     ┌──────────▼──────────┐
   │    PostgreSQL 16    │                     │      Mailjet        │
   │  (Docker-hosted)    │                     │  transactional mail │
   └─────────────────────┘                     └─────────────────────┘
```

Clean-architecture boundary: `Application` depends only on `Domain`, and uses `IApplicationDbContext` so services never touch Infrastructure directly. Per-service `IStringLocalizer<T>` pulls from `.resx` files under `Application/Resources/Services/`. Migrations live in `Infrastructure/Migrations/` and are applied automatically on dev-mode startup.

---

## Tech stack

**Backend**
- .NET 8, ASP.NET Core (controllers, not minimal APIs), API versioning
- Entity Framework Core 8 + Npgsql (PostgreSQL 16)
- BCrypt for password hashing, JWT for auth, SignalR for real-time notifications/messages
- Mailjet for transactional email, Lahza as the payment gateway
- `Microsoft.Extensions.Localization` for server-side i18n (`en`, `ar`)

**Frontend**
- Vite 7, React 19, TypeScript 5.9, Tailwind CSS 3
- Zustand for global state (auth, org memberships, app/theme)
- react-i18next + i18next-browser-languagedetector
- Radix UI primitives, Lucide icons, framer-motion, sonner for toasts
- FullCalendar for schedule views

**Ops**
- Docker Desktop for PostgreSQL (the `tera-postgres` container is what the demo seed connects to)
- Cloudflare Quick Tunnel for live demos (`cloudflared tunnel --url http://localhost:5177`)

---

## Running locally

### Prerequisites
- Node.js 20+ and npm
- .NET 8 SDK
- Docker Desktop (or any PostgreSQL 16 instance reachable at the connection string)

### 1. Start PostgreSQL

If you're on the existing `tera-postgres` container, just make sure it's up. Otherwise:
```bash
docker run -d --name tera-postgres \
  -e POSTGRES_USER=tera -e POSTGRES_PASSWORD=tera -e POSTGRES_DB=AcademixLMS \
  -p 5432:5432 postgres:16
```

### 2. Backend
```bash
cd backend/AcademixLMS.API
# First run will apply all migrations + seed demo users + two demo orgs
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls http://localhost:5261
```
Swagger at <http://localhost:5261/swagger> once it's up.

### 3. Frontend
```bash
npm install
npm run dev    # serves on :5174 (auto-picks another port if taken)
```
Open <http://localhost:5174>.

### 4. (Optional) Public tunnel
```bash
cloudflared tunnel --url http://localhost:5177
# copy the *.trycloudflare.com URL and set App:FrontendBaseUrl to it
# so invite/reset-password emails point to the public URL
```

---

## Demo accounts

All seeded accounts share the password **`Academix123!`**.

| Role | Email |
|---|---|
| Student | `student@academix.com` |
| Student (employees of Acme) | `student01@academix.com`, `student02@academix.com`, `student03@academix.com` |
| Instructor | `teacher@academix.com` (also OrgTeacher under Amman Coding Academy) |
| Platform Admin | `admin@academix.com` |
| Accountant | `accountant@academix.com` |
| Secretary | `secretary@academix.com` |
| **OrgAdmin — Employer** | `orgadmin@acme.com` (Acme Corp) |
| **OrgAdmin — Teaching Institution** | `orgadmin@amman-academy.com` (Amman Coding Academy) |

---

## Configuration reference

Everything lives under `backend/AcademixLMS.API/appsettings.json`. Override via `appsettings.Development.json` or environment variables (double-underscore = nesting, e.g. `PAYMENTS__PLATFORMFEEPERCENT=10`).

| Key | Purpose | Default |
|---|---|---|
| `ConnectionStrings:DefaultConnection` | Postgres connection | Host=127.0.0.1;Port=5432;Database=AcademixLMS;Username=tera;Password=tera |
| `App:FrontendBaseUrl` | Used for password-reset, invite, and other public links in emails | `http://localhost:5174` |
| `Jwt:Secret` / `Jwt:Issuer` / `Jwt:Audience` | Token config | see appsettings |
| `Mailjet:ApiKey` / `Mailjet:SecretKey` / `Mailjet:FromEmail` | Transactional email. If missing, emails log a warning and skip. | Demo keys in file |
| `Support:NotifyEmail` | Every new support ticket emails this address | `academix.lms.ps@gmail.com` |
| `Payments:PlatformFeePercent` | Global default platform cut on course sales | `15` |
| `Organizations:InviteExpiresDays` | Days a member invite is valid | `7` |
| `Lahza:*` | Payment gateway credentials | test keys |
| `Database:DeleteAllUsersOnStartup` | Dev-only: wipe users on boot | `false` |

---

## Project layout

```
backend/
  AcademixLMS.Domain/              # Entities, enums, BaseEntity
  AcademixLMS.Application/         # Services, DTOs, interfaces, .resx
    Resources/Services/*.resx      # IStringLocalizer sources (en + ar)
  AcademixLMS.Infrastructure/      # DbContext, EF configs, migrations, seeders, Lahza, Mailjet
  AcademixLMS.API/                 # Controllers, Program.cs, auth, localization middleware

src/
  components/                      # Reusable UI (LanguagePicker, HelpButton, OrgSwitcher, ...)
    ui/                            # Shadcn-style primitives
    layouts/                       # Student/Teacher/Admin/Org/Staff portal layouts
  pages/
    org/                           # Organization portal (dashboard, members, licenses, compliance)
    support/                       # /support + /admin/support-tickets
    teacher/                       # Includes /teacher/earnings
    student/ teacher/ admin/ accountant/ secretary/ staff/
  services/                        # API clients (one per backend controller group)
  store/                           # Zustand slices (auth, app, org)
  i18n/locales/{en,ar}/*.json      # 10 namespaces: common, nav, auth, errors, public,
                                   #                student, teacher, admin, org, support

docs/
  ROADMAP.md                       # What was done and what remains
  01-responsive-design.md          # ✅ done
  02-arabic-support.md             # ✅ done
  03-finance-dashboard.md
  04-organizations-and-sections.md # ✅ done (Phases 1-4)
  05-investor-pitch.md
  i18n-playbook.md                 # How the frontend translation system is organized
  pitch/                           # Investor deck (HTML + rendered PDF)
```

---

## Key feature flows

### 1. Instructor publishes a course (independent)
1. `teacher@academix.com` → **Create course**.
2. Enters title, description, price. The `RevenueSplitPreview` block below the price updates live — e.g. $100 → Platform $15 · You $85 (using global default 15%).
3. If the user has an `OrgTeacher` membership, a `CourseVisibilityToggle` appears above the preview: "Public catalog" vs. "Under *Amman Coding Academy*". Toggling to the org changes the split to 15% + 30% + 55% (using Amman's fees). An optional "Make it exclusive to *Amman Coding Academy*" checkbox hides the course from the public catalog entirely.
4. Save as draft → Publish. Once Published + not exclusive, the course appears at `/courses`.

### 2. Employer licenses a course for 200 employees
1. `orgadmin@acme.com` signs in. The header `OrgSwitcher` takes them into the Acme portal.
2. **Licenses** → Browses the public catalog (free-price courses are filtered out — only paid courses can be licensed).
3. Picks a course → "License for team" → enters seat count → confirm. A `CourseLicense` row + `Payment(OrganizationBulkLicense, status=Completed)` are created. In dev the license is activated immediately; production expects a Lahza webhook.
4. **Members** → Invites employees by email. Each invitee receives an email with a token (`InviteExpiresDays=7`). They click, land on `/accept-invite?token=...`, set a password, and are logged in.
5. Open the license → **Assign seats** → pick members → optional due date → Assign. Each assignment creates an `Enrollment { AssignedByOrgId, CourseLicenseId }`.
6. **Compliance dashboard** shows KPIs (total/active/completed/overdue/learners), a status filter, and a table highlighted red for overdue rows.
7. Employees see the course in their student portal with an "Assigned by Acme Corp" badge.

### 3. Teaching Institution pools its seat quota
1. Admin creates an org plan and attaches `Organization.SubscriptionId`.
2. All `OrgTeacher`s under the institution: when they try to create a course, `SubscriptionService.BuildSubscriptionStatusAsync` detects the membership, counts courses owned by the org (`Course.OrganizationId == org.Id`), and checks against the org plan's `MaxCourses`. Their personal subscription (if any) is irrelevant.
3. The status DTO's plan name is suffixed `(org-pooled)` so the UI can show that it's the shared quota.

### 4. Support ticket end-to-end
1. Any authenticated user clicks **Help** in the header → **Contact support** → selects category (Billing / Technical / Course / Account / Feedback / Other), types message → Send.
2. Backend sets `Priority = DefaultPriorityForCategory(category)` (Billing/Account → High; Feedback → Low; others → Normal), notifies every admin in-app, and emails `Support:NotifyEmail` (subject `[Support][High] …` etc.).
3. Admin opens `/admin/support-tickets` → filters by status → clicks the ticket → replies. On first staff reply, status flips `Open` → `WaitingOnUser` and `FirstRespondedAt` is stamped. User receives an in-app notification.

### 5. Language across devices
1. User switches to Arabic via the header `LanguagePicker`.
2. `changeLanguage('ar')` → localStorage + `<html dir="rtl">` + font swap + Cairo webfont load.
3. If signed in, `userService.updateLanguage('ar')` fires → backend writes `User.PreferredLanguage`.
4. Next request, the `UserPreferredLanguageCultureProvider` reads that column and wins over `Accept-Language`. Server error strings (from `.resx`) come back in Arabic even if the user is on a new device with a different browser language.

---

## Further reading

- [docs/ROADMAP.md](docs/ROADMAP.md) — what's shipped, what's open
- [docs/i18n-playbook.md](docs/i18n-playbook.md) — how to add a new language
- [docs/04-organizations-and-sections.md](docs/04-organizations-and-sections.md) — full Organization data-model spec
- [docs/pitch/](docs/pitch/) — investor pitch (HTML + rendered PDF)

---

## License

Private demo. All rights reserved.
