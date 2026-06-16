# Deploying the AcademiX free demo (Render)

This deploys the whole app as **one free Render web service** (the .NET API serves
the built React frontend from `wwwroot`, same origin → no CORS) plus a **free
Render PostgreSQL** database. Demo data seeds automatically on first boot.

## What was added for hosting
- `Dockerfile` (repo root) — builds the React frontend and the .NET API into one image.
- `.dockerignore` — keeps the build context small.
- `render.yaml` — Render Blueprint: free web service + free Postgres, auto-wired.
- `Program.cs` — serves the SPA (`UseStaticFiles` + `MapFallbackToFile`), converts
  Render's `DATABASE_URL` to an Npgsql connection string, and points email/payment
  links at the live URL (`RENDER_EXTERNAL_URL`).
- `DatabaseExtensions.cs` — seeds demo accounts/courses/orgs when `Seed:DemoData=true`
  (set in `render.yaml`), not just in Development.

## Step 1 — push to GitHub (run locally)
```powershell
cd D:\projects\academix-demo
del .git\index.lock            # remove stale lock if present (ignore errors)
git add -A
git commit -m "Add free hosted demo: Docker + Render blueprint, serve SPA from API"
git push origin master
```

## Step 2 — create the Render Blueprint
1. Go to https://dashboard.render.com and sign in (use **GitHub** to sign up — free).
2. **New +  →  Blueprint**.
3. Select the **academix-demo** repo. Render reads `render.yaml`.
4. Click **Apply**. Render provisions the Postgres DB and the web service.
5. First build takes ~5–10 min (Docker build of frontend + backend). Watch the logs.

## Notes
- Free service **sleeps after ~15 min idle**; first request after that takes ~30–50s
  to wake. Free Postgres expires after ~30 days (fine for a temporary demo).
- Demo logins (all password `Academix123!`): `student@`, `teacher@`, `admin@`,
  `accountant@`, `secretary@academix.com`, `orgadmin@acme.com`, `orgadmin@amman-academy.com`.
- Payments run in **DemoMode** (complete instantly, no real gateway).
- Uploaded files are stored on the container's local disk, which is **ephemeral**
  on the free plan (lost on restart). Fine for a demo.
</content>
