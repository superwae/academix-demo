# AcademiX LMS — Full Work & QA Prompt

You are working on **AcademiX**, a multi-tenant Learning Management System that was originally
vibe-coded and is now being hardened into a fully working, production-shaped demo. Your job is to
make **every flow work for every role**, remove **all mock/fake data**, redesign any **ugly or
confusing pages**, build any **missing backend** needed so nothing is faked, and finish with an
**honest, evidence-based QA** (no "looks done" claims without actually running it).

Work in **small, verified batches**. After each batch, the build must stay green and the relevant
flow must be tested live. Do not stack large unverified changes.

---

## 1. Project facts (read first)

- **Repo root:** `D:\projects\academix-demo`
- **Frontend:** Vite + React 19 + TypeScript + Tailwind, in `src/`. Dev server: `npm run dev` → http://localhost:5174
- **Backend:** .NET 8 clean architecture in `backend/` (Domain → Application → Infrastructure → API). Run: `dotnet run --project backend/AcademixLMS.API/AcademixLMS.API.csproj` → http://localhost:5261 (`/health` → Healthy). Vite proxies `/api`, `/health`, `/hubs` → 5261.
- **DB:** PostgreSQL (`tera-postgres` docker, user `tera`/`tera`, db `AcademixLMS`). Migrations + seeders apply on dev startup.
- **i18n:** Full English + Arabic (RTL). Every user-facing string must exist in BOTH `src/i18n/locales/en/*.json` and `…/ar/*.json`. Backend messages use `IStringLocalizer` + `.resx` (en + ar) under `backend/AcademixLMS.Application/Resources/Services/`.
- **Money:** Gateway is Lahza, currency **ILS**. NEVER hardcode `$`. Always format via `src/lib/money.ts` `formatMoney(amount, currency)`.
- **Payments demo mode:** `Payments:DemoMode` flag in `appsettings.json` (default `true`). When true, course checkout, subscriptions, and org license purchases complete instantly server-side (`demoCompleted: true`) and enroll/activate immediately — **keep this bypass**, it is intentional. When false, the real Lahza flow runs.
- **Build verification:** the sandbox can't reliably run the app. To verify, run `verify-build.bat` at repo root (runs `tsc --noEmit` + `vite build` + `dotnet build` → writes `verify-output.log`). For live QA, drive the running app at localhost:5174 via the Claude-in-Chrome extension. Both dev servers must be running (`npm run dev` AND `dotnet run`) — `verify-build.bat` only compiles, it does not serve.

### Roles & portals
| Role | Portal | Notes |
|---|---|---|
| Student | `/student/*` | browse, enroll, learn, certificates, messages |
| Instructor | `/teacher/*` | author courses, sections, lessons, exams, earnings |
| Admin/SuperAdmin | `/admin/*` | platform mgmt, finance, support, users |
| Accountant | `/accountant/*` | read-only finance |
| Secretary | `/secretary/*` | calendar, directory, enrollment assist |
| Org (Employer / Teaching Institution) | `/org/:slug/*` | OrgAdmin/OrgManager/OrgTeacher/OrgEmployee |

### Seeded demo accounts — password for ALL: `Academix123!`
- Students: `student@academix.com`, `student01/02/03@academix.com` (01–03 are Acme employees)
- Instructor: `teacher@academix.com` (also OrgTeacher under Amman Academy)
- Admin: `admin@academix.com` · Accountant: `accountant@academix.com` · Secretary: `secretary@academix.com`
- Org admins: `orgadmin@acme.com` (Employer), `orgadmin@amman-academy.com` (Teaching Institution)
- Faculty (each owns 5 courses): `prof01…prof10@academix.com` — Samir Hassan, Layla Nasser, Omar Farid, Rana Khalil, Karim Sabbagh, Nour Mansour, Tariq Barakat, Dina Haddad, Youssef Awad, Maya Rahman

---

## 2. Bugs & requests reported by the owner (Wael) — must all be addressed

### 2.1 CRITICAL — Course publishing is broken
- **Symptom:** Teacher creates a course, clicks Publish, gets a success toast, but the course never appears in the catalog and stays a draft.
- **Root cause (already diagnosed):** `courseService.publishCourse()` did `PUT /courses/{id}` with `{status:'Published'}`, but the security fix that blocks instructors from self-publishing via the update DTO strips `status` for non-admin callers → publish silently no-ops.
- **Required:** publishing must go through `POST /courses/{id}/publish` (the gated endpoint with validation). Course must appear in the public catalog **immediately** (real time) after publish. Test the full create→publish→appears-in-catalog loop live.

### 2.2 Join URL (Zoom/Meet link) not available even when saved
- Teacher sets a section's online meeting link but students can't find/use it.
- Backend persists `JoinUrl` correctly; the gaps: the **Create Course** page had no Join URL field at all, and the link only surfaced through live sessions (which require a weekly meeting time), so a link with no meeting time was invisible.
- **Required:** Join URL editable on both create + edit; enrolled students can always reach it (e.g. a "Join online session" button on their section and in live sessions/calendar).

### 2.3 Course Catalog page was ugly/confusing → redesign (done, keep improving)
- Old page showed `0.0 (0)` ratings, `$` prices, dead hover animation, reloaded on every keystroke.
- Must match landing-page visual language: clean cards, hover lift, debounced search, skeletons, "New" badge for unrated, ILS prices, smooth entrance.

### 2.4 Course Details page confusing + missing functionality → redesign (done, verify)
- Must be clear and not "half-baked": clean hero, clear enroll CTA per section.
- **Section change:** an enrolled student must be able to switch sections (or request it) directly — "Your section" badge on current, "Switch to this section" on others. (Backend `POST /enrollments/{id}/switch-section` added.)
- **Share link:** the course owner/teacher needs an easy "Share" button that copies a public link. That link must lead a logged-out user to a clean register/login → back to the course → enroll flow (honor `returnTo`).
- Paid course → enroll routes through checkout carrying the chosen section.

### 2.5 Landing page (vectr-style) — built; keep it polished
- Reference: https://www.vectrfl.com/ — scroll-pinned isometric story, hover effects, a guiding line you follow while scrolling, big-type sections, giant wordmark footer. Tailored to academia (author → enroll → learn → certify, revenue split, seat tiles).
- Past fixes: label every scene element clearly (e.g. caption the 75% ring as "Course progress", the ORG cube, the seat-grid legend), fix the chapter rail leaking half-text before scroll, add the scroll-follow line, hero entrance animation, fully show the ACADEMIX wordmark (was clipped).

### 2.6 General mandate
> "Fix everything. No mock data anywhere — all of it real. Think through the flow for student, teacher, organizations, admin and make sure everyone works right. If anything is missing, add it (even big features). Redesign any bad page. Then do an honest full QA and redo any bug fixes needed."

---

## 3. Teammate meeting notes (transcribed, incl. Arabic) — triage & implement

- **Teacher Settings page:** apply the admin settings UI/behavior to the teacher portal settings (consistency).
- **Profile page is all mock data** — must be real (see §5).
- **Messaging:** OK. **Subscription:** OK, but shows **"No payment method added"** — wire/clarify payment method state.
- **Students / Quiz & Exam / Lesson content:** OK.
- **Create course:** make Publish work correctly and publish in real time (see §2.1).
- **Create course → course media URL:** "you enter a URL, there is a wide range…" — the media/thumbnail URL input needs clarifying/validating (accept and preview a range of media URL types).
- **Certificate template:** adjust the template so it looks better — currently "too plain/blank and in a weird way." Redesign the certificate visual.
- **Live Sessions vs Manage Courses mismatch:** "Live Sessions مش ضابط مع Manage Courses — something weird." Live sessions list must correctly reflect the teacher's actual courses/sections/meeting times.
- **Teacher dashboard:** review and make data real/consistent.

---

## 4. Missing backend to BUILD for real (owner approved building these)
No fake data — implement the real thing:
- **Admin Audit Log** — domain entity + service + controller + recording of key actions (logins, course publish, user changes, payments, role changes). Wire `AdminAuditLogsPage` to it (replace `MOCK_AUDIT_LOGS`).
- **Payouts** — instructor/org payout records derived from completed payments + revenue split; admin Finance Payouts + Accountant Payouts pages must show real data (replace `PENDING_PAYOUTS` mock).
- **Invoices** — generate invoice records for payments; Accountant Invoices page shows real data.

---

## 5. Remove ALL mock/hardcoded data (audited list)
Wire each to a real endpoint, or build the endpoint (see §4), or remove the section — never display fake data.

| File | Mock to remove | Real source |
|---|---|---|
| `src/pages/student/ProfilePage.tsx` | `MOCK_CERTIFICATES`, `MOCK_STATS` (courses/certs/memberSince), `MOCK_MAJORS`, `MOCK_BADGES`, `MOCK_BIO`, demo avatar/cover | Certificates API, Enrollments count, real user bio/avatar; majors/badges = real feature or remove |
| `src/pages/admin/finance/FinanceOverviewPage.tsx` | `REVENUE_TREND_DATA`, `REVENUE_BY_CATEGORY`, `TOP_COURSES`, `PENDING_PAYOUTS` | payment summary + payouts (build) + top courses query |
| `src/pages/admin/finance/FinancePayoutsPage.tsx` | mock payouts | Payouts backend (§4) |
| `src/pages/admin/AdminAuditLogsPage.tsx` | `MOCK_AUDIT_LOGS` | Audit Log backend (§4) |
| `src/pages/accountant/AccountantPayoutsPage.tsx` | mock | Payouts backend |
| `src/pages/accountant/AccountantInvoicesPage.tsx` | mock | Invoices backend (§4) |
| `src/pages/accountant/AccountantTransactionsPage.tsx` | (already wired to real payments — verify) | `/payments` |
| `src/pages/secretary/SecretaryDirectoryPage.tsx` | mock directory | Users API |
| `src/pages/secretary/SecretaryEnrollmentsPage.tsx` | mock | Enrollments API |
| `src/pages/secretary/SecretaryCalendarPage.tsx` | mock | sessions derived from sections/meeting times |
| `src/services/authService.ts` | hardcoded demo-account mock-login fallback | gate behind `import.meta.env.DEV` only |

(Anything still showing sample data must carry the existing `DemoDataBadge` ONLY as a temporary marker — the goal is zero badges by the end.)

---

## 6. Security / correctness invariants (already largely fixed — keep them true)
- All instructor/org/admin endpoints re-check ownership server-side even if the UI hides the entry point.
- Payment verify is scoped to the caller; webhook fails closed on bad/missing signature.
- `PUT /users/{id}` admin-or-self only; only admins change `IsActive`. `GET /users/{id}` admin-or-self.
- Course publish/archive/delete = instructor-owner-or-admin.
- Subscriptions: paid plans require payment (or demo mode); free plans activate directly.
- Tokens (reset/verify/invite/refresh) are CSPRNG + stored hashed; login lockout after repeated failures.
- No real secrets committed (Mailjet keys blanked; use `appsettings.Local.json`). Callback URLs point at localhost, not dead ngrok.
- File downloads: public folders (avatars/covers) anonymous; submissions/materials require auth.

---

## 7. Honest QA — run this live (Chrome) for EVERY role, fix what breaks
For each flow: perform it in the browser, confirm the expected result in the UI AND that data persisted (reload / check as another role). Record pass/fail with the actual observation.

**Auth:** register → email/login → logout (theme resets, org memberships cleared) → forgot/reset password → accept-invite → login `returnTo` deep link.

**Student:** browse catalog (search/filter/sort) → open course → enroll (free) → switch section → (paid) checkout demo-mode → appears in My Classes → open lessons → Join online session link works → assignments submit → exams → certificate on completion → messages → payments history → profile (real data) → subscriptions (real state).

**Teacher:** dashboard (real) → create course (with section + Join URL + media URL) → **publish → appears in catalog immediately** → edit course → manage sections/lessons → live sessions match courses → assignments create/grade → exams → earnings (real) → discounts → students list → share course link → settings.

**Admin:** dashboard → users (last login real, edit/suspend) → courses (publish/feature) → finance overview/transactions/payouts (real) → subscription plans → support tickets → audit logs (real) → reports → settings.

**Accountant:** transactions / payouts / invoices — all real, read-only.

**Secretary:** calendar / directory / enrollments — all real.

**Org (Employer = Acme):** dashboard → members (invite) → buy licenses → assign seats to employees → compliance. **Org (Teaching Institution = Amman):** OrgTeacher creates course under pooled subscription quota; revenue split correct.

**Cross-cutting:** every page in English AND Arabic (RTL) with no clipped/raw strings; no `$`; no blank pages on unknown sub-routes; no mock data; consistent visual quality (if a page looks "bad," redesign it to match the landing/catalog quality).

---

## 8. Build-warning cleanup (low priority, do near the end)
- Backend `CS8602` possible null-deref in `CoursesController.cs`, `LessonsController.cs`.
- Duplicate resource key `NameRequired` in `OrganizationService.resx` / `.ar.resx` (MSB3568).
- Frontend: recharts circular-dep reexport + dynamic/static import notices (chunking only) — optional.

---

## 9. Definition of done
1. `verify-build.bat` → ALL GREEN (tsc + vite + dotnet).
2. Every flow in §7 tested live and passing, with observations recorded.
3. Zero mock/fake/sample data in any user-facing page; missing backends (§4) built and wired.
4. All owner/teammate items (§2, §3) resolved.
5. Bad/confusing pages redesigned to match the landing + catalog quality bar.
6. English + Arabic both clean. No `$`. No committed secrets.
7. A short, honest QA report: what was tested, what passed, what was fixed, anything still open.
