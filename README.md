# Internal Tools Prototype

## What this is

A prototype for a **build-vs-buy evaluation — not production**. It rebuilds one of our Retool internal tools (the KYC review queue) on a small in-house platform layer that provides what Retool actually gives us: role-based access control, automatic access logging, and audit trails that every app inherits without per-app code. A second thin app (feature flags) is included to show the marginal cost of the next app once the layer exists.

## Quickstart

```bash
npm install
npm run seed     # creates db/platform.sqlite + db/data/{development,staging,production}.sqlite
npm run dev      # → http://localhost:3000
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the architecture overview and the reasoning behind the shared governance layer.

## Features and apps

| Route | App | Features |
|---|---|---|
| `/` | Launcher | Grid of installed apps rendered from the platform registry, filtered server-side by the current user's role. Each card links to the app, its settings page, and (admin-only) its logs. Includes the stubbed **Viewing as:** user switcher. |
| `/kyc` | KYC Review Queue | Case queue with status tabs (pending / in review / approved / rejected), sorting by date or risk score, and high-risk flagging (score ≥ 70). Default tab and risk warnings are user preferences from the app's settings page. |
| `/kyc/[id]` | KYC Case Detail | Full case view with notes, decision history (before/after state), and actions: approve / reject (rationale required, 10+ chars), reassign (admin-only), and override a prior decision (admin-only). The page never checks roles — the governed API accepts or denies each action. |
| `/flags` | Feature Flags | Toggle flags per environment; reviewers can toggle staging but not production (denied server-side). Compact-row display is a user preference. Every toggle is audited. |
| `/settings/[key]` | Per-app Settings | Admin controls: which roles can see the app, and which registered database it is linked to (relinking genuinely changes the data served). Admins can link new databases (created empty with the domain schema) and remove unlinked ones — all audited. Also holds per-user preferences for the app. |
| `/logs/[key]` | Per-app Audit & Access Logs | Admin-only viewer with two tabs — the domain audit trail and the runtime access log — filterable by actor and entity. Non-admin access returns 403 and the denial itself is logged. |

The settings and logs pages are provided by the platform, not by each app — every registered app gets them for free.

## The three audit layers

| Layer | What | Where |
|---|---|---|
| 1 — Tool change log | Who changed the tools themselves. Git history + PR review replaces Retool's app edit history; nothing built. | Git |
| 2 — Runtime access log | Every API request (reads and writes, allowed and denied), written automatically by `withGovernance`. Zero per-app code. | `platform/accessLog.ts` → `access_log` |
| 3 — Domain audit trail | Business decisions (approve/reject/reassign/override/toggle) with before/after state and rationale. | `platform/audit.ts` → `audit_log` |

Both log tables are append-only: the platform exposes insert-only functions and SQLite triggers block UPDATE/DELETE.

## What's real vs. stubbed

Role enforcement, access logging, audit trails, and decision rules are real and server-enforced. Authentication is stubbed with a "Viewing as:" user switcher (no login). See [PROTOTYPE-GAPS.md](./PROTOTYPE-GAPS.md) for the full list of gaps and rough production effort.

