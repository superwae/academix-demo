# 5. Investor & Sales PDF — Platform Overview

## Why
We need a polished, designer-quality PDF to show to investors, prospective
teachers, and prospective organizations. Goal: convince them in under 10
minutes that AcademixLMS is worth funding / joining / buying.

## Audience
Same document targets three slightly different readers — content has to
work for all three:

1. **Investors** — care about market, business model, traction, roadmap.
2. **Teaching orgs & independent teachers** — care about how much they'll
   earn, what tools they get, how students find them.
3. **Employer orgs** — care about how to train their workforce, compliance,
   reporting, price per seat.

Keep sections modular so a tailored variant can be produced for each
audience by toggling 2–3 slides.

## Deliverable

- Format: **A4, landscape, PDF**.
- Pages: 14–18 (not a 40-page deck; sharp and skimmable).
- Bilingual: English master + Arabic variant (same file with Arabic pages
  at the end, OR two separate PDFs — decide with marketing).
- Export from a source file we can edit later (Figma → PDF, or a
  backend-generated HTML → PDF).

## Suggested section outline

1. **Cover** — product name, tagline, date, contact.
2. **The problem** — one page, 3 bullets on the pain we solve.
3. **The solution** — high-level positioning, one screenshot.
4. **Who it's for** — the three audience archetypes, illustrated.
5. **Feature highlights** — one page per feature cluster with a screenshot:
   - Course creation (inline meeting times, batches, certificates)
   - Live classes (weekly schedule, one-click join)
   - Payments & subscriptions (Lahza integration, discounts)
   - Analytics & AI (at-risk students, recommendations)
   - Organizations (Type A + Type B, pulled from doc #4)
   - Messaging & notifications
6. **Demo flow** — screenshot storyboard of 4–5 steps end-to-end.
7. **Business model** — revenue split for teachers, subscription tiers for
   orgs, employer seat licensing.
8. **Tech stack & security** — one slide for technical readers.
9. **Roadmap** — next 6 months, pulled from `docs/ROADMAP.md`.
10. **Team** — founder bios if any.
11. **Ask / contact** — what we want from the reader.

## Producing the file

Two paths:

### Path A — design tool (recommended for v1)
- Build in Figma using the app's existing colors (HSL tokens in
  `src/style.css`) so the PDF matches the UI.
- Take high-res screenshots from the demo environment (run the Cloudflare
  tunnel at 1920×1080, full-page captures via Playwright — we already
  have `scripts/capture-screenshots.mjs` and
  `presentation-screenshots/` folders).
- Export → PDF.

### Path B — HTML → PDF (for long-term maintainability)
- Build a dedicated route `/pitch` rendered server-side (or a static
  HTML page) with the pitch content.
- Use **Puppeteer** or **Playwright** to render to PDF.
- Advantage: data (stats, screenshots) regenerates automatically on
  every export.

Start with Path A to hit the deadline; port to Path B later if we end up
iterating on the pitch frequently.

## Content constraints

- No mock data in screenshots. Log into a seeded demo account
  (e.g. prof01@academix.com) so the numbers look real and consistent.
- Redact email addresses / personal info visible in screenshots.
- Don't lie about features that aren't shipped — if Arabic support is on
  the roadmap but not live, show it on the roadmap slide, not as a
  current feature.

## Distribution

- Host the final PDF at a stable URL (S3 / Cloudflare R2), don't email
  it as an attachment (too easy to lose track of versions).
- Include a QR code on the cover page that links to a live demo account.

## Definition of done

- [ ] A PDF exists at `docs/pitch/AcademixLMS-Pitch-EN.pdf` (and `-AR.pdf`).
- [ ] Screenshots are current (taken from a build within the last 2 weeks).
- [ ] Marketing reviewer and one founder have signed off.
- [ ] The source file is committed to the repo so anyone can edit and
      re-export.
- [ ] The file opens cleanly on mobile, desktop, and when printed.
