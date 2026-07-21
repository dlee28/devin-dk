# Architecture

## Overview

The prototype is a single **Next.js (App Router)** application backed by **SQLite**, split into three layers with a strict dependency direction: apps depend on the platform; the platform knows nothing about any specific app.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js (App Router)                         │
│                                                                     │
│  app/            Pages & API routes (thin routing shell)            │
│   ├─ /, /kyc, /flags, /settings/[key], /logs/[key]   ── pages       │
│   └─ /api/**  ── every handler wrapped in withGovernance(...)       │
│                              │                                      │
│  apps/           THIN APPS (UI only: pages + components)            │
│   ├─ kyc/        queue, case detail                                 │
│   ├─ flags/      feature-flag panel                                 │
│   ├─ settings/   per-app settings page (platform-provided)          │
│   └─ admin/      per-app log viewer (platform-provided)             │
│                              │ inherits governance                  │
│                              ▼                                      │
│  platform/       SHARED GOVERNANCE LAYER                            │
│   roles (RBAC map) · withGovernance (wrapper) · accessLog           │
│   audit · currentUser (stub) · appRegistry · appSettings            │
│   databases (registry + getAppDb) · config                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
        SQLite
        ├─ db/platform.sqlite            users, access_log, audit_log,
        │                                app settings, database registry
        └─ db/data/<name>.sqlite         app domain data (cases, notes,
           (development/staging/prod)    flags) — selected per app via
                                         its linked-database setting
```

- **Next.js App Router** serves both the UI (server-rendered pages under `app/`) and the API (`app/api/**` route handlers). One deployable, no separate backend.
- **SQLite** keeps the prototype dependency-free while still being real: the platform DB and the app data DBs are separate files, and both log tables are append-only (insert-only functions + triggers blocking UPDATE/DELETE).
- **`/platform`** is the shared governance layer: role definitions, the `withGovernance` wrapper, access/audit logging, the app registry, per-app settings, and the database registry.

## Why a shared governance layer?

The point of the prototype is not the KYC queue — it is the layer underneath it. The evaluation question is "can we replace what Retool actually gives us?", and what Retool gives us is *governance*: RBAC, access logging, and audit trails that every app gets without writing them.

**Governance is inherited, not implemented.** Every API handler is wrapped in `withGovernance({ permission, entityType, ... })`, which resolves the actor, enforces the permission against the role map, runs any contextual rule, and writes an access-log row for **every** request — allowed or denied. Consequently, code under `/apps` contains no role checks and no log writes. It cannot forget to enforce or to log, because it never does either.

**Reusability.** Cross-cutting concerns are written once and shared: the settings page (`/settings/<key>`), the admin log viewer (`/logs/<key>`), the launcher, role visibility, and database linking are all platform features. A new app gets all of them for free by registering.

**Scalability (marginal cost of the next app).** Adding an app means adding a registry entry, its API handlers (wrapped in `withGovernance`), and its UI. The feature-flags app exists precisely to demonstrate this: it required no platform changes beyond a registry entry and two permission entries. As the number of internal tools grows, governance cost stays flat instead of being re-paid per app.

**Consistency and auditability.** Because enforcement and logging live in one choke point, behavior is uniform — denials are logged the same way as approvals, in the same tables, across every app. Auditors and admins learn one model, and a policy change (e.g., a new role) is made in one place and applies everywhere.

## Trade-offs at scale

The same centralization that makes governance cheap creates friction as the number of apps and teams grows:

**Coupling / coordination bottleneck.** Every app depends on the platform's interfaces, so the platform becomes a shared dependency with a shared change process. A breaking change to `GovernanceOptions` or the roles model forces touching every app at once, and even small cross-cutting needs route through the platform — the feature-flags app, for example, required adding its two permissions to the central `roles.ts`. With a handful of apps this is fine; with dozens of teams the platform turns into a gatekeeper, and its release cadence caps everyone else's. Mitigations: treat `/platform` as a versioned internal package with a stability contract, keep app-specific policy (per-app permissions) declared by the app rather than edited into central files, and hold platform changes to a higher review/test bar than app changes.

**One-size-fits-all governance won't fit every future app.** The model assumes all apps want the same shape of governance: a flat role map, permission-per-endpoint, and uniform logging. Apps with different needs — row-level security, multi-step approvals, external identity, data-residency rules — must either bend the shared model or lean on escape hatches like the `authorize()` callback. Each escape hatch moves policy back into per-app code, eroding the "apps never check roles" guarantee that justified the layer. The realistic posture is to accept that the platform serves the 80% of internal tools with standard needs, extend it deliberately when a second or third app shares a new requirement, and let genuinely divergent apps live outside it rather than distorting the common layer for one consumer.
