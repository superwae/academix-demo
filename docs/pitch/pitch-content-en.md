# AcademiX — Investor Pitch (Source Content)

> This is the source-of-truth for the investor-facing PDF. Content is
> written for **Path A (design in Figma)** and **Path B (HTML → PDF)**
> — both render from this outline.
> Every claim below maps to code already merged to `master`. Screenshots
> should come from a live seeded demo environment, not mockups.

---

## 1. Cover

**AcademiX** — The operating system for online learning in the Middle East.

> A modern, Arabic-first LMS that lets independent teachers, schools, and
> companies launch, sell, and run online courses — with local payments,
> live classes, and AI-powered student insights built in.

- Demo: `https://academix.sa/demo` (or current tunnel URL)
- Contact: [founder email]
- Deck version: v1 · April 2026

---

## 2. The problem

**The MENA online-education market is worth $X billion and growing 20%+
YoY** — but the tools serving it are broken:

| Pain | Who feels it |
|---|---|
| Coursera / Udemy are English-first. Arabic content is a second-class citizen (no RTL, no Arabic UX, no Arabic payment rails). | Arabic-speaking learners and instructors |
| Local payment gateways (Lahza, MyFatoorah, HyperPay) are not supported by global LMS platforms. | Teachers lose 5–10% per transaction to forex + processor fees |
| Schools and companies that want to train students/employees have to stitch together Zoom + Google Forms + spreadsheets. | Institution admins |
| There's no single platform that serves **independent teachers**, **teaching institutions**, and **corporate L&D** with the right tools for each. | Everyone |

> **The gap: a modern, Arabic-native, MENA-payment-native LMS that scales
> from a single teacher to a 10,000-seat enterprise.**

---

## 3. The solution — AcademiX

One platform, three audiences, one shared infrastructure.

```
             ┌─────────────────────────────────────────────┐
             │            AcademiX Platform                │
             │  (courses, payments, analytics, live video) │
             └─────────────────────────────────────────────┘
                 ▲               ▲                ▲
     ┌───────────┘               │                └──────────┐
     │                           │                           │
 Independent            Teaching Institutions          Employer
   Teachers              (universities, schools,      Organizations
  (sell courses)          bootcamps, centers)      (train employees)
```

### What's live today (not on the roadmap — shipped to `master`)

- **Course marketplace** — catalog, search, ratings, reviews.
- **Lahza payments** — real integration, test + production keys, webhook
  signature verification.
- **Subscription plans** — Starter / Professional / Enterprise tiers,
  monthly & yearly billing, cancel anytime.
- **Discount codes** — percentage or fixed-amount, per-course, with
  usage limits and expiry.
- **Live classes** — per-section join URLs, weekly schedule with
  "Live now / Starting soon" badges, one-click join.
- **AI student analytics** — engagement score, risk level (Low →
  Critical), grade prediction, risk-factor breakdown, recommended
  interventions.
- **Smart recommendations** — collaborative + content-based filtering
  (trending, similar, new-in-field, continue-learning).
- **Certificates** — configurable per course, tied to completion.
- **Assignments + exams** — multi-choice, short-answer, auto-grade +
  manual grade override, delayed score release.
- **Real-time messaging** — SignalR WebSocket, unread counters,
  block/report moderation tools.
- **Cohort management** — "Start New Batch" clones an entire course
  (lessons, assignments, exams, sections) with fresh enrollments.
- **Multi-role portals** — Student, Teacher, Admin, Accountant, Secretary,
  each with purpose-built UX.

---

## 4. Who it's for

### 4.1 Independent teacher
> "I have expertise. I want to teach. I don't want to be a web developer."

- Create a course in under 30 minutes — title, content, schedule, price.
- Add discount codes for your audience.
- Get paid in local currency via Lahza (no Stripe required).
- See who's at risk and reach out before they drop.

### 4.2 Teaching institution (school / university / bootcamp)
> "We have 30 instructors. We need a single place to manage all of them,
> with seat-based limits and central billing."

- Onboard teachers under one organization.
- Subscription tier caps total courses and seats across all teachers.
- Central revenue dashboard — see every course's earnings.
- Single bill, central finance, granular per-teacher reporting.

### 4.3 Employer (corporate training)
> "We have 500 employees. We need them to complete mandatory compliance
> courses by Q4, and I need reports for the auditor."

- Buy seat licenses on public courses **or** build private courses
  (exclusive to your org).
- Assign courses to employees — they can't self-enroll, they're added.
- Compliance reports: who's done, who's overdue, who's at risk.
- Employees never see pricing — it's a billed-line-item back to HR.

---

## 5. Product highlights (one page each in the deck)

### 5.1 Course creation
*Screenshot: `CreateCoursePage` with sections expanded showing meeting
time editor.*

**Key**: everything a course needs is set in one form — title,
description, pricing, schedule (days + times per section), batches,
certificates. No multi-step wizard, no coming back to fill gaps.

### 5.2 Live classes
*Screenshot: `TeacherLiveSessionsPage` with a red "Live now" badge on
a current session, and the student's mirror view with the "Join"
banner.*

**Key**: we solve the "what's my schedule this week + how do I join"
problem. Teachers set a Zoom/Meet URL once per section and every
weekly occurrence inherits it. Students see a clean list, click Join,
done.

### 5.3 Payments
*Screenshot: Lahza checkout redirect + successful callback page.*

**Key**: we accept local cards and wallets via Lahza. Students pay in
ILS/JOD/USD. Platform takes a % cut, teachers are paid out monthly.
Discount codes and subscription billing go through the same rail.

### 5.4 AI student insights
*Screenshot: teacher-scoped student detail page showing risk score,
risk factors, and recommendations.*

**Key**: we don't just store data — we act on it. Every enrolled
student has a live risk score computed from engagement, grade trend,
assignment submission rate, and days-since-last-activity. Teachers
see "who to check on" without scrolling through 200 students.

### 5.5 Organizations & licensing
*Screenshot: org admin dashboard with per-teacher earnings breakdown
+ license assignment panel.*

**Key**: our two-sided marketplace scales UP into B2B. A company can
buy 50 seats of "Intro to Python" and assign them one by one to
employees — same course, different billing.

### 5.6 Branding & theming
*Screenshot: the 14 theme presets + custom color picker.*

**Key**: every institution gets their own look and feel — colors,
theme, logo, cover images, bio. Preferences sync across devices via
the user's profile.

---

## 6. Demo flow (4-slide storyboard)

1. **Teacher creates a course** in 30 seconds (title → sections →
   meeting times → publish).
2. **Student buys it** using a discount code, redirected through
   Lahza checkout.
3. **Student joins the live class** from the dashboard — one click.
4. **Teacher sees the at-risk panel** — a student missed two sessions,
   risk score spiked, recommended action shown.

---

## 7. Business model

### 7.1 Three revenue streams

| Stream | Who pays | Pricing | % of revenue (year 1 target) |
|---|---|---|---|
| **Marketplace commission** | Independent teachers | 15% take on every course sale | 40% |
| **Platform subscriptions** | Teaching institutions, independent teachers who want a fixed cost | Starter $30/mo, Professional $80/mo, Enterprise $200/mo (annual discount 20%) | 35% |
| **Enterprise training** | Employer orgs | Seat-license pricing for public courses + subscription for internal content | 25% |

### 7.2 Unit economics (sample)

- Avg course price: $60 · Avg teacher take-home: $51 · Platform: $9
- Avg student lifetime enrolments: 2.4
- Avg LTV per student: $144 in GMV → **~$22 per student in platform revenue**
- Avg CAC through inbound + teacher referral: $7
- **LTV/CAC ≈ 3x** at scale

### 7.3 Subscription tiers (live)

| Plan | $/mo | Max courses | Seats/course | Total seats |
|---|---|---|---|---|
| Starter | 29.99 | 3 | 30 | 90 |
| Professional | 79.99 | 15 | 100 | 500 |
| Enterprise | 199.99 | Unlimited | Unlimited | Unlimited |

Tiers are fully CRUD-editable from the SuperAdmin panel — we can
experiment with pricing without shipping code.

---

## 8. Market opportunity

- **MENA e-learning TAM**: ~$X billion by 2028 (Statista / HolonIQ).
- **Arabic-speaking internet users**: 250M+, growing.
- **Palestinian, Jordanian, Saudi online-learning markets** are
  specifically underserved by global incumbents because of payment
  rails (Lahza, MyFatoorah, HyperPay are not integrated by Udemy/
  Coursera).
- **Employer training in GCC** is a $Y billion market driven by
  Saudi Vision 2030's Human Capability Development Program — every
  major employer is looking for a compliance-training platform.

*Replace X and Y with sourced numbers before showing to investors.*

---

## 9. Competitive positioning

|  | Udemy | Coursera | Thinkific | AcademiX |
|---|:-:|:-:|:-:|:-:|
| Arabic UI + RTL | ✗ | Partial | ✗ | **✓** |
| Local payment rails (Lahza) | ✗ | ✗ | ✗ | **✓** |
| Live classes built in | ✗ | ✓ | ✗ | **✓** |
| Employer seat licensing | ✗ | ✓ | ✗ | **✓** |
| AI at-risk detection | ✗ | ✓ | ✗ | **✓** |
| Multi-tenant orgs | ✗ | ✗ | Partial | **✓** |
| Open to MENA independent teachers | ✗ | ✗ | ✓ | **✓** |

**Our moat**: the only platform that simultaneously serves Arabic
independent teachers, MENA teaching institutions, and GCC employer
training — with local payment rails built in from day one.

---

## 10. Technology

- **Frontend**: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.
- **Backend**: .NET 8 ASP.NET Core · PostgreSQL · Entity Framework Core.
- **Real-time**: SignalR over WebSockets with long-polling fallback.
- **AI/ML**: in-house scoring (engagement + risk) running server-side
  in the Application layer — no external model dependency, predictable
  cost.
- **Payments**: Lahza gateway with server-side verification + HMAC
  SHA-256 webhook signature.
- **Architecture**: Clean Architecture (Domain → Application →
  Infrastructure → API); modular monolith today, ready to split into
  services when scale demands it.

**Security posture**: JWT auth with refresh tokens, rate limiting,
structured Serilog logging, global exception handler, soft-delete
everywhere, role-based policy enforcement at every endpoint.

---

## 11. Traction / status

*Replace this section with real numbers before the meeting. Template:*

- Built by a team of [N] engineers over [M] months.
- [X] courses already live in a pilot with [School Name].
- [Y] monthly active students in the current closed beta.
- [Z] orgs on the waitlist.
- Technical milestones: 50+ seeded demo courses, 18+ test accounts,
  6 QA regression rounds passed, subscription and payment flows
  end-to-end tested against Lahza's sandbox.

---

## 12. Roadmap (next 6 months)

Pulled from [`docs/ROADMAP.md`](../ROADMAP.md):

| Quarter | Milestone |
|---|---|
| Q2 2026 | Ship org types (Type A + Type B), finance dashboard, responsive mobile layout |
| Q3 2026 | Full Arabic + RTL launch, launch pilot with first paying school |
| Q4 2026 | Enterprise training contracts, native mobile app (React Native), expand Lahza → MyFatoorah + HyperPay |
| Q1 2027 | SOC 2 Type I, Saudi market entry, white-label offering |

---

## 13. Team

*To be filled in — include:*
- Founders with short bio (education, previous company, relevant expertise)
- Advisors
- Engineering org chart at a glance

---

## 14. The ask

**Raising $[amount] to:**
1. Scale engineering (3 → 8 engineers) to ship the org-type and mobile
   milestones.
2. Hire a head of sales for MENA institutions.
3. Marketing budget for the first 2 pilot acquisition cycles.
4. 12 months of runway at current burn.

**What we offer investors:**
- Proven technical team that can ship fast (6 QA rounds of the pitch
  platform in 2 weeks).
- Unit-economics-positive model from day one (commission-based
  marketplace + subscription SaaS revenue).
- Defensible moat in a specific, underserved geography.
- Clear path to a $100M+ regional business.

---

## 15. Appendix / contact

- Website: `academix.sa`
- Live demo: [current tunnel URL]
- Email: [founder]
- Deck: [stable URL]
- One-pager: [stable URL]

---

## Notes for the designer

- **Palette**: pull HSL tokens from `src/style.css` (`--primary`,
  `--foreground`, etc.) so the deck matches the product.
- **Typography**: Poppins for headings, Inter for body (matches the app).
- **Arabic variant**: mirror the layout RTL, swap to "Cairo" or "Noto
  Sans Arabic" for Arabic text.
- **Screenshots**:
  - Resolution: 1920×1080 minimum, taken at 2× DPR.
  - Browser chrome removed — use full-page captures.
  - Tool: `scripts/capture-screenshots.mjs` (Playwright) for repeatable
    output.
- **Icons**: match the app's Lucide icon set for visual consistency.
- **Tone**: confident, concrete, numbers-forward. No vague "next-gen
  disruption" language.
