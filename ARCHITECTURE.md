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
