# Prototype Gaps

Running list of every stub or skipped capability. Input to the gap analysis — accuracy over optimism.

| Gap | Why skipped in prototype | What production requires (1 line) | Rough effort |
|---|---|---|---|
| SSO / authentication | Stubbed with "Viewing as:" cookie switcher so role enforcement can be demonstrated without auth plumbing | OIDC SSO (e.g., Okta) with session management, offboarding, and role sync from the IdP | 1–2 engineer-weeks |
| Credential isolation / secrets vault | No external services in the prototype; SQLite file needs no credentials | Central secrets manager (e.g., Vault/AWS SM) with per-app scoped credentials and rotation | 1–2 engineer-weeks |
| Log immutability (WORM/SIEM) | Enforced only with insert-only modules + SQLite triggers | WORM object storage or SIEM export with a write-restricted DB role | 1 engineer-week |
| Environment separation | Single machine; separation is one config file switching DB paths | Separate deployments, databases, and credentials per environment with promotion gates | 1–2 engineer-weeks |
| Release management / change approval | Git history + PR review stands in for Retool's app edit history and release flow | CI/CD with protected branches, mandatory review, and audited deploys | 1 engineer-week |
| Server-side pagination at scale | Seed data is 25 rows; log views use a LIMIT 200 | Cursor-based pagination and indexed queries for tables in the millions of rows | 2–4 engineer-days |
| Refunds dashboard | Explicit non-goal of this prototype | Third thin app on the platform layer, plus payments-system integration | 1–2 engineer-weeks |
| Backup / retention policy | File-based SQLite recreated by seed; no data worth retaining | Automated backups, tested restores, and a compliance-driven retention schedule for logs | 2–4 engineer-days |
| Real KYC data / identity APIs | Explicit non-goal; all seed data is fictional | Integration with a KYC/identity provider and secure PII handling (encryption at rest, field-level access) | 2–4 engineer-weeks |
| Flags app platform additions | The flags app needed two new permissions (`toggle_staging_flag`, `toggle_production_flag`) added to `platform/roles.ts` — beyond the registry-entry-only rule of §12 | A permission-registration mechanism so apps declare permissions without editing the platform role map | 2–3 engineer-days |
