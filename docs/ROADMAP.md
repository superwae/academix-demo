# AcademixLMS — Launch Roadmap

Tracks the remaining work before the platform is launch-ready. Each numbered
item has its own deep-dive file in this folder.

| # | Area | Status | Doc |
|---|------|--------|-----|
| 1 | Responsive design (mobile + tablet) | Not started | [01-responsive-design.md](./01-responsive-design.md) |
| 2 | Arabic language support (i18n + RTL) | Not started | [02-arabic-support.md](./02-arabic-support.md) |
| 3 | Finance / earnings dashboard for teachers & organizations | Not started | [03-finance-dashboard.md](./03-finance-dashboard.md) |
| 4 | Organization types + course modality expansion | Not started | [04-organizations-and-sections.md](./04-organizations-and-sections.md) |
| 5 | Investor-facing PDF pitch document | **Content drafted** · [pitch/pitch-content-en.md](./pitch/pitch-content-en.md) | [05-investor-pitch.md](./05-investor-pitch.md) |

## Priority order

1. **#4 (Organizations + modality)** — foundational data-model work; everything
   else depends on the two org types existing.
2. **#3 (Finance dashboard)** — depends on payment data that already exists and
   org ownership from #4.
3. **#1 (Responsive)** — independent, can run in parallel with anything.
4. **#2 (Arabic / RTL)** — independent but large; start once the layout has
   stabilized from #1.
5. **#5 (Investor PDF)** — produced once the platform reaches a demoable state.

## How to use this folder

- When you start a task, change its status in the table above to `In progress`.
- When a task is done, change status to `Done` and link the PR(s).
- Each deep-dive doc ends with a **Definition of done** checklist. Don't mark
  the task done until every box is ticked.
- Anything not covered by one of these docs belongs in a separate issue; don't
  expand the scope of an existing doc silently.

## Project conventions (keep in mind for every item)

- **Clean architecture**: Domain → Application → Infrastructure → API. Frontend
  services mirror backend DTOs one-to-one.
- **Security**: Only validate at boundaries. All instructor / org endpoints
  must re-check ownership even if the UI hides the entry point.
- **Secrets**: Never commit API keys, DB passwords, or Lahza secrets. They go
  in `appsettings.json` / `.env` and both must be listed in `.gitignore` before
  the first sensitive value is added.
- **No browser alerts**: Use the `ConfirmDialog` component + `sonner` toasts.
- **No spaghetti**: Extract shared helpers to `src/lib/` (frontend) or a
  service (backend). Don't duplicate for convenience.
