# Migration: OptiMass off Manus

End-to-end migration of the existing app to self-hosted infrastructure.
All code stays; only the deploy / hosting / DB layer changes. After this,
every PR auto-deploys via Vercel + Railway with zero Manus involvement
and zero per-deploy tokens.

## Cost summary

| Item | Monthly |
|---|---|
| Vercel (frontend) | $0 (Hobby tier) |
| Railway (backend) | ~$5 once the included credit runs out |
| PlanetScale (MySQL) | $0 free tier (sleeps after 7d idle; ~$39 for always-on production) |
| Firebase Auth | $0 |
| Custom domain (optional) | ~$10/yr |
| **Total** | **$0–15/mo for hobby; ~$50/mo for production-grade** |

Compared to Manus token cost per deploy, this pays off after a few weeks.

---

## Phase 0 — Accounts (~20 min, $0)

Sign in to each with GitHub so they can read the repo:

- [ ] **Vercel** — vercel.com — Hobby (free)
- [ ] **Railway** — railway.app — $5 trial credit, ~$5/mo after
- [ ] **PlanetScale** — planetscale.com — Free tier

Alternative DB if PlanetScale's sleep behavior bothers you: **Neon**
(neon.tech) — Postgres, $0 tier with no sleep. But switching engines
means a Drizzle schema migration. Recommend MySQL on PlanetScale for now.

---

## Phase 1 — DB extraction (~10 min)

One Manus prompt — keep it short to minimize tokens:

> "Give me a mysqldump of the production database, gzip it, and send me
> a download link."

You'll get a file like `optimass-db-YYYYMMDD.sql.gz`. Keep it on your
machine.

---

## Phase 2 — DB import (~30 min)

1. PlanetScale dashboard → New database → name `optimass` → region near you.
2. Copy the connection string from Settings → looks like:
   `mysql://<user>:<pass>@aws.connect.psdb.cloud/optimass?ssl={"rejectUnauthorized":true}`
3. Install the PlanetScale CLI (`pscale`) if you haven't:
   - Mac: `brew install planetscale/tap/pscale`
   - Windows: download from PlanetScale docs
4. Authenticate: `pscale auth login`
5. Import the dump:
   ```bash
   pscale db restore-dump optimass main optimass-db-YYYYMMDD.sql.gz
   ```
6. Paste the connection string into a temporary text file — needed in Phase 3.

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
2. Add these env vars in Railway dashboard:
   ```
   DATABASE_URL          = (from Phase 2)
   FIREBASE_PROJECT_ID   = (existing)
   FIREBASE_CLIENT_EMAIL = (existing)
   FIREBASE_PRIVATE_KEY  = (existing)
   ANTHROPIC_API_KEY     = (existing, for LLM rating prose)
   NODE_ENV              = production
   PORT                  = ${{PORT}}   (Railway provides this)
   ```
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
