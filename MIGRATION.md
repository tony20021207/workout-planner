# Migration: OptiMass off Manus

End-to-end migration of the existing app to self-hosted infrastructure.
All code stays; only the deploy / hosting / DB layer changes. After this,
every PR auto-deploys via Vercel + Railway with zero Manus involvement
and zero per-deploy tokens.

## Cost summary

| Item | Monthly |
|---|---|
| Vercel (frontend) | $0 (Hobby tier) |
| Railway (backend + MySQL together) | ~$5–10 once included credit runs out |
| Firebase Auth | $0 |
| Custom domain (optional) | ~$10/yr |
| **Total** | **$5–10/mo for hobby; ~$20–30/mo if traffic grows** |

PlanetScale was originally in this plan but they killed their free Hobby tier in April 2024 (cheapest now is $15/mo). Replaced with Railway MySQL — same Railway dashboard as the backend, ~$3–5/mo, faster latency since both services share Railway's internal network.

Compared to Manus token cost per deploy, this pays off after a few weeks.

---

## Phase 0 — Accounts (~10 min, $0)

Sign in to each with GitHub so they can read the repo:

- [ ] **Vercel** — vercel.com — Hobby (free)
- [ ] **Railway** — railway.app — $5 trial credit, ~$5–10/mo after (hosts BOTH backend + MySQL)

That's the full account list. PlanetScale was originally here but their
free tier was killed in April 2024 — moved the DB to Railway instead.

---

## Phase 1 — DB extraction (~10 min)

One Manus prompt — keep it short to minimize tokens:

> "Give me a mysqldump of the production database, gzip it, and send me
> a download link."

You'll get a file like `optimass-db-YYYYMMDD.sql.gz`. Keep it on your
machine.

---

## Phase 2 — DB setup + import (~30 min)

The database lives in your Railway project alongside the backend. Both
share Railway's internal network — fast queries, single dashboard.

1. Railway dashboard → New Project (or open the project you'll use for
   the backend) → click **"+ New"** → **Database** → **MySQL**.
2. Railway provisions a MySQL service in ~30 seconds. Click the service
   → **Variables** tab → copy the value of `MYSQL_URL` (looks like
   `mysql://root:<pass>@<host>:<port>/railway`). Save in a temp file.
3. Restore the dump from Phase 1. From your local terminal:
   ```bash
   # Decompress the dump
   gunzip optimass-db-YYYYMMDD.sql.gz

   # Restore against the Railway MySQL using the connection string
   mysql --host=<host> --port=<port> --user=root --password=<pass> railway < optimass-db-YYYYMMDD.sql
   ```
   (You can grab the per-field values from Railway's MySQL Variables
   tab — they're shown as `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE`.)
4. Verify in Railway's Data tab — you should see all your tables
   (`users`, `workouts`, `calendarEntries`, etc.).

---

## Phase 3 — Backend deploy on Railway (~30 min)

**Claude writes:** to a new branch `migrate/off-manus`:
- `Procfile` for Railway
- `railway.toml` config
- Updated env-var handling for PlanetScale + Firebase
- Health check endpoint

**You do:**

1. Railway → New Project → Deploy from GitHub → pick `workout-planner` →
   branch `migrate/off-manus`
2. Add these env vars in Railway dashboard. For the MySQL connection,
   Railway's variable-reference syntax means you don't paste the
   password directly — you reference the MySQL service:
   ```
   DATABASE_URL          = ${{MySQL.MYSQL_URL}}   (auto-resolves at runtime)
   FIREBASE_PROJECT_ID   = (existing)
   FIREBASE_CLIENT_EMAIL = (existing)
   FIREBASE_PRIVATE_KEY  = (existing)
   ANTHROPIC_API_KEY     = (existing, for LLM rating prose)
   NODE_ENV              = production
   ```
   (PORT is set automatically by Railway — no need to add it.)
3. Click Deploy.
4. Once it builds, Railway gives a URL like `optimass-api.up.railway.app`.
   Copy it — Phase 4 needs it.

**Smoke test:**
```bash
curl https://optimass-api.up.railway.app/api/trpc/auth.me
```
Should return a tRPC auth error (means it's running and reachable).

---

## Phase 4 — Frontend deploy on Vercel (~20 min)

**Claude writes:** to the same branch:
- `vercel.json` build config
- Updated `vite.config.ts` (output dir, API base URL via env)
- Updated `client/src/main.tsx` to read backend URL from `VITE_API_URL`

**You do:**

1. Vercel → Add New → Project → import `workout-planner` →
   branch `migrate/off-manus`
2. Build settings (Vercel auto-detects Vite — just confirm):
   - Framework Preset: Vite
   - Build command: `npm run build`
   - Output: `dist/`
3. Add env vars:
   ```
   VITE_API_URL              = https://optimass-api.up.railway.app
   VITE_FIREBASE_API_KEY     = (existing)
   VITE_FIREBASE_AUTH_DOMAIN = (existing)
   VITE_FIREBASE_PROJECT_ID  = (existing)
   ```
4. Deploy. Vercel gives `optimass.vercel.app`.

---

## Phase 5 — Firebase Auth wire-up (~5 min)

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `optimass.vercel.app` (and your custom domain later if you buy one)

Without this, Google sign-in rejects the new origin.

---

## Phase 6 — Smoke test (~15 min)

Open `optimass.vercel.app` on desktop + phone:

- [ ] Log in (Firebase Google sign-in)
- [ ] Profile setup modal opens
- [ ] Build a routine
- [ ] Rate it (LLM call works → Anthropic API key wired)
- [ ] Build a split (Opti-split)
- [ ] Fill sets (Opti-fill)
- [ ] Save to calendar
- [ ] Check in — log a set
- [ ] Reload — Check-in data persists

If any step fails, copy the browser console error and the Railway log
tail and share them. Easy to fix; almost always an env-var typo.

---

## Phase 7 — Cutover (~5 min)

1. PR `migrate/off-manus` → `main` on GitHub. Merge via the PR button.
2. Vercel + Railway are now wired to auto-deploy `main` on every push.
3. **Leave the Manus URL up for a week** as a fallback. Don't delete
   anything from Manus until you've used the new setup for real
   workouts without issues.

---

## Phase 8 — Custom domain (optional, ~10 min + $10/yr)

1. Buy `optimass.app` (or whatever) at Cloudflare Registrar or Namecheap.
2. Vercel → Project → Settings → Domains → add yours.
3. Update DNS at the registrar to point to Vercel's records.
4. Firebase Console → Authorized domains → add the custom domain.

---

## Steady-state workflow after migration

```
You:                  change request
Claude:               write code, push to feature branch
You:                  merge PR via GitHub UI (1 click, $0)
Vercel + Railway:     auto-deploy main (2 min, $0)
You:                  visit URL, see the change
```

Zero Manus tokens for deploys. Zero prompting. Yours.

---

## What stays on Manus during/after migration

| Service | Status after migration |
|---|---|
| Frontend | Old URL keeps working short-term, then deprecate |
| Backend | Same — keep as fallback for a week |
| Database | **Only source-of-truth until Phase 2 import succeeds.** Snapshot it; don't write to two DBs in parallel — Manus DB becomes read-only the moment Phase 2 starts, then archive after Phase 6 succeeds. |
| Firebase | Not on Manus — Google-hosted. Just update authorized domains. |

---

## Rollback if something breaks

Any phase 0–4 can be undone without affecting production — the Manus
deploy keeps running. Phase 7 (cutover) is the first non-recoverable
step in the sense that it's "now the canonical URL"; even there, you
keep both URLs live, so users on the old Manus URL keep using the old
backend + old DB while you sort out the new setup.

The DB cutover (Phase 2) is the one place to be careful — once you start
writing to PlanetScale, you stop writing to Manus DB. If you find a
critical bug after that point, the rollback is "redo Phase 2 in reverse"
(dump PlanetScale, restore to Manus). Annoying but recoverable.

Recommendation: do Phase 6 smoke test thoroughly before announcing the
new URL to anyone.

---

## When you come back

Tell Claude: *"I've signed up for the three accounts, let's start the
migration"* — Claude will write the Phase 3 + 4 configs and push to
`migrate/off-manus`. Then you click deploy on Railway, get the URL,
share it, and Claude updates the frontend env config.

Or: *"Pick up the migration from Phase N"* — Claude reads this file and
resumes there.
