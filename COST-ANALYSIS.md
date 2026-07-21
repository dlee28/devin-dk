# Cost Appendix — In-House Internal Tool Platform (Build-vs-Buy Analysis)

Supporting cost model for the build-vs-buy recommendation. Baseline for comparison: **$250K/yr Retool contract** covering 3 internal apps (KYC review queue, refunds dashboard, feature-flag admin panel).

**Core assumptions:** fully-loaded senior engineer cost ~$340K/yr (approx. $220K salary x ~1.55 overhead multiplier) → **~$6,500 per engineer-week**. AWS as cloud provider. Existing IdP (Okta/Google) and GitHub seats are already paid and not counted as incremental. Devin handles app-layer work; platform and security work is human-owned, so platform line items are not discounted for AI acceleration.

---

## Table 1 — One-Time Build-Out: Known Gaps (from PROTOTYPE-GAPS.md)

Engineering effort to close every gap identified during the prototype, converted to weeks.

| Work item | Weeks (low–high) |
|---|---|
| SSO / auth | 1 – 2 |
| Secrets vault / credential isolation | 1 – 2 |
| Log immutability (WORM/SIEM) | 1 |
| Environment separation | 1 – 2 |
| Release mgmt / CI/CD | 1 |
| Server-side pagination | 0.5 – 1 |
| Refunds dashboard (app #3) | 1 – 2 |
| Backup / retention | 0.5 – 1 |
| KYC provider integration + PII handling | 2 – 4 |
| Permission-registration mechanism | 0.5 |
| Real database connections / pooling / migrations | 1 – 2 |
| **Subtotal — known gaps** | **10.5 – 19.5** |

## Table 2 — One-Time Build-Out: Hidden Work (not captured in the gaps list)

Work that build-side estimates typically omit.

| Hidden work | Weeks | Why it's required |
|---|---|---|
| Migration off Retool: parallel running, data validation, process cutover, user training | 2 – 3 | The Retool apps are live compliance workflows; a KYC queue cannot be hard-cut |
| Security review + pen-test remediation | 1 – 2 | Fintech internal tool touching PII and money movement |
| Monitoring / observability / alerting | 0.5 – 1 | Production tools require it; absent from the gaps list |
| Compliance evidence work: access-review procedures, SOC 2 control documentation, auditor walkthroughs | 1 – 2 | Replaces the vendor attestation previously handed to auditors |
| **Realistic build total (Tables 1 + 2)** | **~15 – 27 engineer-weeks** | **~$100K – $175K one-time (midpoint ~$135K)** |

Calendar equivalent: one engineer for 4–6 months, or two engineers for one quarter.

## Table 3 — Ongoing Engineering Ownership (recurring)

Steady-state ownership of three compliance-critical tools: patching, bug fixes, feature requests, quarterly access reviews, audit support.

| Period | FTE range | Weeks/yr | $/yr |
|---|---|---|---|
| Steady state (Year 2+) | 0.25 – 0.5 | 13 – 26 | $85K – $170K |
| Year 1 (post-launch, ~1/2 year) | — | 6 – 13 | $40K – $85K |

Devin's largest legitimate cost impact is here (routine patches and small features), which justifies holding the low end of the range — not cutting below it.

## Table 4 — Compute & Infrastructure (recurring)

Sized for ~60 internal users, two environments, fintech-grade posture, on AWS.

| Component | $/month |
|---|---|
| Prod compute (2x small containers/instances + ALB) | 90 – 180 |
| Prod Postgres, Multi-AZ (RDS db.t3.medium class) | 130 – 260 |
| Staging (scaled-down mirror) | 80 – 150 |
| Log pipeline + 1-yr retention + S3 Object Lock (WORM) | 60 – 150 |
| Secrets Manager, backups, misc | 20 – 50 |
| Monitoring (CloudWatch or modest Datadog) | 50 – 250 |
| **Total** | **~$430 – $1,040/mo → ~$5K – $12.5K/yr** |

Additional items: **Devin subscription/ACUs** ~$6K – $15K/yr (plan + consumption dependent); **external pen test** ~$15K – $30K one-time (standard for fintech tools handling PII/refunds).

Key observation: the entire infrastructure bill is ~2–5% of the Retool contract. This is a labor-cost decision, not an infrastructure-cost decision.

## Table 5 — Year 1 Total and Year 2+ Run-Rate vs. Retool

| Cost category | Low | High |
|---|---|---|
| Build-out (Tables 1–2) | $100K | $175K |
| Ownership, post-launch ~1/2 yr (Table 3) | $40K | $85K |
| Compute + infra (Table 4) | $5K | $12.5K |
| Devin | $6K | $15K |
| Pen test | $15K | $30K |
| **Year 1 total** | **~$166K** | **~$318K** |
| **Year 2+ run-rate** (ownership + compute + Devin) | **~$96K** | **~$198K** |

Reading against the $250K/yr Retool contract:

- **Year 1 is roughly a wash** — midpoint (~$240K) lands on the license cost, and both are likely paid in parallel during migration.
- **Savings materialize in Year 2+**: ~$50K – $150K/yr at midpoint assumptions; payback period ~18–30 months.
- **Error bars are one-sided**: compute cannot get much cheaper, but compliance-adjacent engineering routinely overruns 1.5–2x. Downside case: Year 1 at $300K+ with savings pushed to Year 3.
- **The renegotiation alternative discounts every row**: if the Retool contract (or an Appsmith/ToolJet migration) can reach ~$80–100K/yr, Year 2+ savings shrink toward zero while build risk remains.

## Table 6 — Marginal Cost per New Tool: In-House vs. Retool

Cost of building tool #4, #5, #6 on each path. In-house assumes the platform exists and Devin generates app-layer code; Retool assumes the license is sunk.

| Tool tier | Definition / examples | In-house + Devin | Retool (license sunk) |
|---|---|---|---|
| Tier 1 — CRUD over existing data | Admin panels, lookup tables, ops dashboards (e.g., the flags panel) | 2 – 4 days / $2.5K – $5K | 0.5 – 2 days / ~$0 marginal |
| Tier 2 — workflow tools with state, roles, audit implications | Chargeback review queue, vendor-approval flow (the KYC queue's class) | 1 – 2 wks / $6.5K – $13K | 3 – 5 days / ~$0 marginal |
| Tier 3 — tools requiring a new platform capability | First tool needing a new external integration, file uploads, scheduled jobs, notifications, new data-source type | 2 – 4+ wks / $13K – $26K+ | Often ~days (connector exists) |
| Ownership delta per additional tool | Added maintenance baseline, in perpetuity | +2 – 4 days/yr | ~0 (vendor-maintained) |

Notes:

- **Amortization favors build at volume**: at 3 tools the platform investment costs ~$45K/tool; at 8 tools, ~$17K/tool — while Retool's per-seat pricing grows with adoption.
- **Tier-3 risk favors buy**: each new-capability request is a mini-project in-house and a checkbox in Retool. The build case is a bet that future tools stay within Tiers 1–2.
- **Observed leak in the prototype**: the flags app (Tier 1) required two new permissions added to the platform role map — a Tier-1 app leaking a Tier-3 platform need. This is the failure mode
