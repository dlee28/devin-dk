# Internal Tools Prototype — KYC Review Queue on a Shared Governance Layer

## What this is

A prototype for a **build-vs-buy evaluation — not production**. It rebuilds one of our Retool internal tools (the KYC review queue) on a small in-house platform layer that provides what Retool actually gives us: role-based access control, automatic access logging, and audit trails that every app inherits without per-app code. A second thin app (feature flags) is included to show the marginal cost of the next app once the layer exists.

## Quickstart

```bash
npm install
npm run seed     # creates and populates db/dev.sqlite
npm run dev      # → http://localhost:3000
```

## Architecture

Apps inherit governance; they do not implement it. Every API route handler is wrapped by `withGovernance(...)`, which resolves the actor, checks the declared permission against the role map, and writes an access-log row for every request — allowed or denied. App code under `/apps` contains pages and components only: no role checks, no log writes.

```
                ┌────────────────────────────────────────────┐
                │   /platform  (SHARED GOVERNANCE LAYER)     │
                │  roles · withGovernance · accessLog        │
                │  audit · currentUser · config · registry   │
                └───────▲──────────────▲──────────────▲──────┘
                        │  inherits    │  inherits    │  inherits
                ┌───────┴─────┐ ┌──────┴──────┐ ┌─────┴───────┐
                │  /apps/kyc  │ │ /apps/flags │ │/apps/settings│
                │ (thin app)  │ │ (thin app)  │ │ (per-app cfg)│
                └─────────────┘ └─────────────┘ └──────────────┘
```

Every app also gets a per-app **settings page** (`/settings/<key>`: role visibility, linked database, user preferences) and a per-app **audit & access log view** (`/logs/<key>`, admin-only) — both provided by the platform, not the app.

## The three audit layers

| Layer | What | Where |
|---|---|---|
| 1 — Tool change log | Who changed the tools themselves. Git history + PR review replaces Retool's app edit history; nothing built. | Git |
| 2 — Runtime access log | Every API request (reads and writes, allowed and denied), written automatically by `withGovernance`. Zero per-app code. | `platform/accessLog.ts` → `access_log` |
| 3 — Domain audit trail | Business decisions (approve/reject/reassign/override/toggle) with before/after state and rationale. | `platform/audit.ts` → `audit_log` |

Both log tables are append-only: the platform exposes insert-only functions and SQLite triggers block UPDATE/DELETE.

## What's real vs. stubbed

Role enforcement, access logging, audit trails, and decision rules are real and server-enforced. Authentication is stubbed with a "Viewing as:" user switcher (no login). See [PROTOTYPE-GAPS.md](./PROTOTYPE-GAPS.md) for the full list of gaps and rough production effort.

## Demo script (~3 minutes)

1. Open the launcher at `http://localhost:3000/`. You are viewing as Alex Rivera (admin); each app card has settings and (admin-only) log icons.
2. Use the **Viewing as:** dropdown to switch to Maria Chen (reviewer). The per-app log icons disappear — the launcher is filtered server-side from the app registry and settings.
3. Open **KYC Review Queue**, filter to *pending*, and sort by risk score. High-risk cases (score ≥ 70) are flagged.
4. Open a pending case and click **Approve** with an empty rationale — the server rejects it with a 400. Enter a rationale (10+ chars) and approve; the decision appears in the case history with before/after state.
5. Still as Maria, try **Reassign** on any case — 403 Forbidden, because reassignment is admin-only.
6. Try to open `/logs/kyc` as Maria — 403 again.
7. Switch back to Alex Rivera and open the KYC card's log icon (`/logs/kyc`). On the *Access log* tab, filter actor to `u-maria`: her approval, her denied reassign attempt, and her denied logs access are all recorded — the denials with `outcome=denied`, logged with zero app-level code.
8. (Optional) Open **Feature Flags** and toggle a staging flag; as a reviewer, toggling a production flag is denied. Every toggle is in the audit log.
