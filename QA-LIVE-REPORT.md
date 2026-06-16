# AcademiX LMS — Live QA Report

**Target:** https://academix-demo.onrender.com
**Date:** June 16, 2026
**Scope:** Exhaustive — all 7 roles, public pages, Arabic/English + RTL, responsive, UI/UX polish, professionalism.
**Severity scale:** 🔴 Critical (broken/blocking) · 🟠 Major (wrong behavior, bad UX) · 🟡 Minor (visual/copy) · 🔵 Polish (nice-to-have)

> Legend for "Lang": AR = Arabic UI, EN = English UI. RTL = right-to-left layout correctness.

---

## Executive summary

The platform is **functionally strong and visually professional**. Core flows work end-to-end on the live demo: registration/login, course catalog, **enrollment → demo payment → enrolled class**, lessons, dashboards for all 7 roles, teacher course creation, earnings, admin user management, finance/secretary workspaces, and org member management. Empty states are thoughtful and the Arabic copy is well-written.

The dominant theme is **inconsistent internationalization**, not missing features. The app already has the localization building blocks (some screens localize levels, months, money, roles perfectly) — they're just **not applied uniformly**, so other screens leak English enums, dates, and even the wrong currency. Fixing this centrally will lift perceived quality dramatically.

**Coverage:** public/landing, auth, and all 7 roles (student, teacher, admin, accountant, secretary, org-admin) were walked on the live site. Money/RTL/i18n checked throughout. _Not done this round:_ a mobile-width responsive pass and deep per-feature testing of exam-taking/grading and messaging (limited by demo data + browser freezes). 

### Top priorities (fix first)

| Pri | Sev | Issue | Where |
|-----|-----|-------|-------|
| 1 | 🔴 | **Accountant portal shows USD "$"** instead of ILS ₪ on all money | AC1 |
| 2 | 🔴 | **Checkout pay button "ادفع $‏79.99 ₪"** — hardcoded `$` + ₪ | S1 |
| 3 | 🟠 | **Logout button does nothing** (can't sign out) | §3/§8 |
| 4 | 🟠 | **Inconsistent i18n**: enums (level/format/status/category), weekdays/times, dates English on catalog/detail/dashboards but localized elsewhere | C1–C3, D1–D2, S2–S3, cross-cutting #1 |
| 5 | 🟠 | **App footer fully English + dead `#` links**; RTL reverses the copyright | C4–C5 |
| 6 | 🟠 | **Landing connector line desync** + onboarding categories English | W1, W2 |
| 7 | 🟠 | **RTL punctuation/segment reversal** for English text (descriptions, times, copyright) | C3, D2 |
| 8 | 🟠 | **"متابعة المشاهدة" → `/lessons/undefined`**; FAQ accordion opens all; latent `fileService` crash | §2/§8, L4, S7 |
| 9 | 🟡 | **"DEV" badge** + verbose `console.log` of API payloads in production | §8 |
| 10 | 🟡 | **Brand inconsistency** (AcademiX / أكاديميكس / English subtitle) | L2, AC2, SE1 |

---

## 0. Issues already reported by Wael

| # | Sev | Area | Issue | Fix idea |
|---|-----|------|-------|----------|
| W1 | 🟠 | Student onboarding modal ("خصّص تجربتك") | Category names render in **English** (Business & Management, Data Science & Analytics, Technology & Programming, Science & Mathematics, Personal Development, Design & Creative) and their descriptions are English, while the whole UI is Arabic. | Add AR translations for category names + descriptions; pull from i18n, not hardcoded English. |
| W2 | 🟠 | Landing page (HomePage) — "How it works" isometric story | The animated connector **line does not follow the active point**: a stray solid blue segment sits at top-left disconnected from the dotted path, and a line runs *ahead* of the dot. Path/point are out of sync. | Recompute the SVG path geometry to anchor to the dot position per scroll step; remove the leading/overshoot segment. |

---

## 1. Public + auth pages

### 1a. Landing page (HomePage)

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| L1 | 🟠 | both | **Revenue split number flips between languages**: EN shows "85% / 15%", AR shows "15% / 85%" (RTL mirrored the literal). Misrepresents the teacher/platform split. | Render the split as a non-mirroring unit (bdi/`dir="ltr"` on the number) so 85/15 stays 85/15 in both languages; or localize as labelled "أنت 85% / المنصة 15%". |
| L2 | 🟡 | AR | Brand subtitle **"Learning Management System"** stays English under the logo while the whole UI is Arabic. | Translate to "نظام إدارة التعلّم" via i18n. |
| L3 | 🟡 | both | Pinned hero headline/subtitle **ghosts through** behind the "How it works" isometric while scrolling (faded text overlaps the diagram). | Fade hero opacity to 0 (not ~0.15) once the story step engages, or move it behind an opaque layer. |
| L4 | 🟠 | both | **FAQ accordion** appears to expand multiple/all items at once (single-collapse not working). Matches the earlier `Accordion type="single"`/`value` TS error in HomePage.tsx. | Fix the Accordion API usage (the component doesn't accept `type`/`value` as written) so only one item opens at a time. |
| L5 | 🔵 | AR | Nav item **"كيف يعمل"** doesn't visibly navigate (pinned story means the anchor lands at section top with no feedback). | Either scroll-snap into the first story step, or briefly highlight the section. |
| L6 | 🔵 | AR | CTA/footer **arrow icons** (←/↖) — confirm they're intentionally mirrored for RTL; the "browse courses" arrow points away from the text. | Mirror directional icons with the layout direction. |
| W2 | 🟠 | both | (Confirmed) "How it works" animated **connector line doesn't track the active dot** — stray solid segment top-left + path runs ahead of/below the point. | Recompute SVG path to anchor to the dot per scroll progress; remove leading/overshoot segment. |
| W1 | 🟠 | AR | (Confirmed) Student onboarding modal **category names + descriptions are English** under Arabic UI. | i18n the six category names + descriptions. |

_Positive: hero, FAQ copy, footer CTAs, and How-it-works step text are all properly Arabic and read professionally._

### 1b. Course catalog (`/courses`)

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| C1 | 🟠 | AR | **Category filter chips** (Physics, Mathematics, Management, Humanities, Design, Business) are English; only "الكل" is Arabic. | Localize category labels (map enum → i18n). |
| C2 | 🟠 | AR | Course **level "Intermediate"** on every card is English. | Localize level enum (مبتدئ/متوسط/متقدّم). |
| C3 | 🟠 | AR | Course **descriptions are English** and, inside the RTL card, the trailing period jumps to the left ("‎.labs, assignments…"). Punctuation/мирroring bug for LTR text in RTL. | Wrap LTR text in `bdi`/`dir="auto"`; seed Arabic descriptions for the demo. |
| C4 | 🟠 | AR | App/marketing **footer is fully English** ("Company/Product/About/Contact/Help…") on all non-landing pages, and the copyright "© 2026 AcademiX. All rights reserved." reverses under RTL. | Localize the shared footer; isolate LTR strings. |
| C5 | 🟡 | AR | Footer **social/About/Contact/Help links are dead** (`href="#"`). | Wire real links or hide until ready. |
| C6 | 🔵 | both | **Perf:** catalog (and course-detail) pages repeatedly made the renderer unresponsive to screenshot capture for several seconds — suggests a continuously-running animation pegging the main thread/GPU. Worth profiling on low-end devices. | Audit always-on animations (orbit/motion); pause off-screen. |

### 1c. Course detail (`/courses/:id`)

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| D1 | 🟠 | AR | Enum fields **Level "Intermediate", Format "Hybrid", Category "Physics"** all English in both the header chips and the "معلومات الدورة" info box. | Localize level/format/category enums. |
| D2 | 🟠 | AR | **Weekday "Monday"** and time "1:00 PM" under "أوقات اللقاءات" are English. | Localize weekday + time format (use date-fns ar locale). |
| D3 | 🟡 | AR | Course **sections listed out of order** (Section B, then A, then C). | Sort sections by name/start time. |
| D4 | 🟡 | AR | Footer same English/dead-link issues as C4/C5. | (shared footer fix) |
| _ | ✅ | — | Positive: price formats correctly ("‏79.99 ₪"), seats ("40 مقاعد متبقّية"), reviews, and section/enroll labels are Arabic. Enroll buttons present per section. | |

### 1d. Login + Register

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| A1 | 🟡 | AR | Register **phone placeholder is `+966` (Saudi Arabia)** while currency is ILS and locale is Palestine/Jerusalem. | Use `+970`/`+972` or a generic mask. |
| _ | ✅ | — | Login ("مرحباً بعودتك") and Register ("إنشاء حساب") are otherwise fully Arabic, correct RTL, clear validation hint ("8 أحرف على الأقل"). | |

## 2. Student role

Covered: dashboard, catalog, course detail, **checkout + demo payment (works end-to-end)**, my-classes, lessons, calendar, payments, settings. Enrollment → demo pay → enrolled class all functional. ✅

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| S1 | 🔴 | both | **Checkout pay button reads "ادفع $‏79.99 ₪"** — a hardcoded `$` is concatenated with the ILS-formatted amount, so two currency symbols show and the `$` is just wrong. (Exactly the "never hardcode $" rule.) | Use `formatMoney(total)` only; remove the literal `$`. |
| S2 | 🟠 | AR | **Date format is English everywhere**: "Tuesday, Jun 16, 2026" (dashboard, date picker), "تم التسجيل Jun 16, 2026" (my-classes). | Format dates with date-fns `ar` locale when UI = Arabic. |
| S3 | 🟠 | AR | **Enum values not localized** (systemic): Level "Intermediate", Format "Hybrid", status "Active", category tags ("Physics", "Computer Science", "Management"), weekday "Monday", time ranges. Appears on dashboard, my-classes, lessons, checkout. | Central enum→i18n maps for level/format/status/category + localized weekday/time. |
| S4 | 🟡 | AR | Header **"Student" role badge** and **"Light" theme label** are English; Settings shows **"الحالي: light"**. | Localize role + theme labels. |
| S5 | 🟡 | AR | Lesson **titles + descriptions are English** ("Lesson 1: Introduction & overview", "Recorded lecture on YouTube…"), durations "35m". | Seed Arabic lesson data; localize duration unit. |
| S6 | 🟡 | AR | Course **sections render out of order** (B, A, C) on detail + lessons. | Sort by name/start time. |
| S7 | 🟠 | — | **Latent runtime bug:** the lessons "مواد الدورة" download path references `fileService` (undefined — the build TS error). The demo course has no files so it doesn't fire, but it **will throw when a course has materials**. | Import/define `fileService` in `CourseLessonsPage.tsx`. |
| S8 | 🔵 | — | **Renderer freeze / perf** repeatedly on student app pages (screenshots time out for seconds; DOM stays responsive). | Profile always-on animations; this is the same as C6. |
| _ | ✅ | — | Positive: calendar, payments, settings, my-classes, lessons all clean Arabic with good empty states; "Reset demo data" is a nice touch; enrollment/payment works. | |

## 3. Teacher role

Covered: dashboard, create-course (full form), earnings. (This `teacher@` account "Teacher Demo" has 0 courses; it is **also org-admin of "Amman Coding Academy"** via a portal switcher.) Largely excellent Arabic.

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| T1 | 🟠 | AR | **Create-course → "الشُّعب" quick-add buttons are English**: "Online", "In-site", "Hybrid", "Section 1–4". Also **"In-site"** is inconsistent with the "في الحرم"/On-campus term used in the mode dropdown. | Localize the section-template labels; standardize the on-site term. |
| T2 | 🟡 | AR | Dashboard stat **"متوسط التقييم 5.0 /0"** — the "rating / count" format reads oddly (looks like 5.0 ÷ 0). | Show "—" when no reviews, or "٥٫٠ (٠ تقييم)". |
| T3 | 🟡 | AR | (systemic) Dashboard date **"Tuesday, Jun 16, 2026"** English; **"Teacher" badge** + **"Light"** label English. | (shared date/enum/label fix) |
| ⭐ | 🟠 | — | **KEY INSIGHT — inconsistent i18n:** create-course (Level مبتدئ/متوسّط/متقدّم, Mode عبر الإنترنت/مختلط) and earnings (months يناير…، money ‏0.00 ₪) are **fully localized**, but catalog / course-detail / cards / dashboards show the *same* enums in English and English dates. The localization utilities exist — they're just not applied consistently. | Centralize + apply enum/date/money localization across all components. |
| _ | ✅ | — | Positive: create-course form is thorough and professional; earnings page money + months perfect; dashboards clean with good empty states; org portal switcher works. | |

## 4. Admin role

Covered: dashboard (KPIs, charts, top courses), users management (filters, import/export). Well-organized, professional Arabic.

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| AD1 | 🟡 | both | **"DEV" badge** is shown in the admin header on the live site — looks unprofessional / leaks environment. | Hide the env badge in production builds. |
| AD2 | 🟡 | AR | System-status card shows **"healthy"** (English) and chart axis shows **"Jun 16"** (English date). | Localize status enum + chart date formatter. |
| AD3 | 🟡 | AR | Header **"Admin" role badge** + **"Light"** theme label English — yet the Users filter localizes roles (مسؤول/مدرّس/طالب). Same inconsistency pattern. | Reuse the role i18n map in the header badge. |
| _ | ✅ | — | Positive: executive KPI cards, enrollment/activity charts, top-courses, user table with role/status filters + import/export + per-row message — all clean, professional Arabic; logically grouped sidebar (Management / Finance / Subscriptions / Reports & System). | |

## 5. Accountant role

Covered: financial workspace dashboard (reconciliation, compliance checklist, settlement pipeline).

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| AC1 | 🔴 | both | **Entire finance portal shows money in USD "$"** — "$6,420", "$48,290", "$12,400", "$28,910", "$6,980" — instead of **ILS ₪**. Student/teacher sides correctly use ₪, so finance uses a different/hardcoded formatter. Wrong currency on the money-of-record screens is serious. | Route all amounts through `formatMoney` (ILS); remove hardcoded `$`. |
| AC2 | 🟡 | both | **Brand renders "أكاديميكس" (Arabic)** in this portal vs "AcademiX" (Latin) in student/teacher/admin. Pick one. | Standardize brand lockup. |
| AC3 | 🟡 | AR | Likely **typo "تخت تسوية قائمة الاستردادات"** ("تخت" → "تثبيت"/"تمّت"). | Proofread compliance copy. |
| _ | ✅ | — | Positive: compliance checklist, settlement pipeline, KPI cards well-structured; role badge "مالية" is localized. | |

## 6. Secretary role

Covered: operations / front-office dashboard (queues, SLA, today timeline, directory, shortcuts).

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| SE1 | 🟡 | both | Same **brand inconsistency** ("أكاديميكس" vs "AcademiX") as accountant. | (shared brand fix) |
| _ | ✅ | — | Positive: fully Arabic, professional; SLA/“today” widgets with correct Arabic units (٢س ١٠د), 24h times, good shortcuts. No money shown, no currency issue. | |

**Cross-role inconsistency:** role badge localization is split — accountant ("مالية") & secretary ("عمليات") are Arabic, but student/teacher/admin badges are English ("Student"/"Teacher"/"Admin").

## 7. Org-admin role (Acme Corp / acme-corp)

Covered: org dashboard (KPIs, empty state), members management (table, role/status, invite). Org-admin is **membership-based** (global role stays "Student"; `roleInOrg: OrgAdmin`). Distinct, simpler portal layout. amman-coding-academy uses the same portal (reachable via the teacher account's switcher).

| # | Sev | Lang | Issue | Fix idea |
|---|-----|------|-------|----------|
| OR1 | 🟠 | AR | **Org description is English** ("A hospital group using AcademiX for mandatory staff training") under Arabic UI. | Seed Arabic org descriptions / allow localized field. |
| OR2 | 🟡 | AR | **Date format here is numeric "2026/6/16"** while other portals use English "Jun 16, 2026" — inconsistent across the app. | Standardize on one localized date format. |
| OR3 | 🟡 | — | Status here is Arabic ("نشط") but student my-classes shows English ("Active"); confirms enum-localization inconsistency. | Shared status i18n map. |
| _ | ✅ | — | Positive: members table (name/email/role/status/joined + delete), invite-member, role (مسؤول/موظف) + status localized, licenses/compliance/courses nav — professional Arabic. | |

## 8. Cross-cutting (i18n, RTL, responsive, performance)

These patterns span the whole app and are the highest-leverage fixes:

1. **Inconsistent localization is the #1 theme.** The same enums/dates/money are localized in some components and English in others:
   - Localized well: create-course (level/mode), earnings (months + ₪), admin user-filter roles, org member roles/status.
   - English where it shouldn't be: catalog/course-detail/cards (level, format, category, weekday, time), dashboard dates, header role + theme badges, org status/description, onboarding categories.
   - **Fix once, centrally:** enum→i18n maps (level/format/status/category/role), a localized date+time formatter (date-fns `ar`), and a single `formatMoney` for *all* amounts.
2. **Currency:** ILS ₪ is correct on student/teacher, but the **Accountant portal uses USD "$"** (AC1) and the **checkout pay button injects a literal "$"** (S1). No amount should ever render a hardcoded "$".
3. **RTL text isolation:** LTR strings inside RTL containers reverse their punctuation/segments — course descriptions ("‎.labs…"), footer copyright, time ranges ("AM – 10:00 AM 8:00"). Wrap LTR runs in `bdi`/`dir`.
4. **Brand inconsistency:** "AcademiX" (Latin) vs "أكاديميكس" (Arabic) vs "Learning Management System" subtitle (English) — standardize the lockup per language.
5. **Shared footer** on app pages is fully English with dead `#` links (About/Contact/Help, social).
6. **Functional bugs:** logout button does nothing (had to clear storage to switch accounts); "متابعة المشاهدة" links to `/lessons/undefined`; FAQ accordion opens all items; landing connector line desync (W2); latent `fileService` crash on lesson materials (S7).
7. **Performance:** several app pages (catalog, course-detail, student/teacher/admin inner pages) repeatedly froze the renderer to screenshot capture for seconds — likely an always-on animation pegging the main thread. Profile and pause off-screen/idle animations.
8. **Production hygiene:** verbose `console.log` of full API payloads ("[RecommendationService] Raw API response…") ships in prod; a **"DEV" badge** shows in the admin header; tokens stored in `localStorage`.
9. **Responsive:** _not yet tested at mobile widths_ — recommend a dedicated mobile pass after these fixes (the freeze + connection drops made resize testing unreliable this round).
