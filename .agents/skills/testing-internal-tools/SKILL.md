---
name: testing-internal-tools
description: Test the internal-tools governance prototype (launcher, KYC queue, admin logs, feature flags) end-to-end. Use when verifying UI flows, role enforcement, or audit/access logging changes.
---

# Testing the internal-tools governance prototype

## Setup
```bash
npm install
npm run seed        # recreates db/platform.sqlite + db/data/{development,staging,production}.sqlite
npm run dev         # http://localhost:3000
```
Seeding is destructive — run it before each test session to get a deterministic state.
Checks: `npm run lint`, `npm run build`, `npx tsc --noEmit`.

## Identity & roles
No login. The "Viewing as:" dropdown in the top nav sets the `viewing_as` cookie (defaults to the seeded admin, Alex Rivera). Users: `u-alex` (admin), `u-maria`/`u-james`/`u-priya` (reviewers). Server-side enforcement lives in `platform/withGovernance.ts` + `platform/roles.ts` — test via UI actions, not curl, so denied requests also appear in the access log.

## Golden-path checks
1. Launcher `/`: apps filtered by each app's `visible_to_roles` setting; per-card log icons appear only for admins.
2. `/kyc`: approve a pending case with empty rationale → 400 banner; with ≥10-char rationale → approved + `case.approve` history entry.
3. As reviewer: Reassign and `/logs/kyc` → 403 Forbidden banners.
4. As admin: `/logs/kyc` (per-app log viewer) Access tab, filter by actor id → the reviewer's denials show as red `denied` rows. Logs are per application — `/logs/flags` only shows flag + flags-settings entries.
5. `/flags`: reviewer can toggle staging; production toggle → 403 banner.
6. Shell regression: verify SQLite triggers block `UPDATE/DELETE` on `access_log`/`audit_log` using Node + `better-sqlite3` (the `sqlite3` CLI may not be installed).
7. `/settings/[key]` (gear icon on each launcher card): as admin, uncheck a role / change linked database → save → the launcher for that role updates; as reviewer, save → 403; unchecking `admin` → 400 "Admins cannot be locked out"; each save writes an `app.settings.update` audit row with before/after JSON.
8. Per-user prefs (e.g. KYC default tab, risk highlighting): save as one user, verify the app behavior changes for them only; a second user should be unaffected.
9. Linked databases are real: as admin, on `/settings/kyc` switch Linked database `development` → `staging` → save → `/kyc` shows the staging dataset (8 `stg-case-*` rows vs 25 dev cases; production has 5 `prod-case-*` rows). In the Databases (admin) section: "Link new database" creates an empty registered db (schema applied, selectable in the dropdown); the trash button removes an unlinked db, is disabled/refused (400) while any app links it; reviewers see no admin section and POST/DELETE `/api/databases*` → 403. Link/remove/relink all write audit rows (`database.link`, `database.remove`, `app.settings.update`).

## Gotchas
- Tailwind classes used only under `apps/` or `platform/` compile only if those globs are in `tailwind.config.ts` `content`. If a component renders but appears unstyled/invisible (e.g. toggle switches), check the content globs first.
- After switching users via the dropdown, client pages that fetched data (e.g. `/logs/kyc`) may keep stale data — `router.refresh()` doesn't re-run client `useEffect` fetches. Do a full page reload after switching.
- Restarting the dev server: kill existing `next dev`/`next-server` PIDs explicitly (`ss -ltnp | grep 3000`) before starting a new one, or the new server silently binds another port and localhost:3000 serves stale/404 responses.
- `npm run seed` may fail with `SQLITE_IOERR_SHORT_READ` if the dev server holds the DBs' WAL files. Kill the dev server and `rm -f db/*.sqlite* db/data/*.sqlite*` before reseeding.
- Client pages that fetch both prefs and data on mount can race (initial fetch overwrites the pref-driven one). If a pref appears applied in the UI chrome but not in the data, suspect a fetch race rather than a broken pref.

## Devin Secrets Needed
None — the app runs fully locally with a stubbed identity and no external services.
