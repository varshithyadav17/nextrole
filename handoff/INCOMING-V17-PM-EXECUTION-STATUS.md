# Product implementation status — v17 local review

The central priorities remain broader job discovery and controlled application assistance/automation. The current source includes the application workflows and the supplied résumé layout; the full vision remains unfinished and this candidate is not deployed.

| Product need | Implemented locally | Remaining |
| --- | --- | --- |
| Broad discovery | 20 retained ATS boards; configurable employers; new multi-employer Jobicy feed; resumable bounded pages; source attribution, freshness, unknowns and separate status checks | Licensed search, platform partnerships, LinkedIn/Unstop/Internshala ingestion, labelled relevance/coverage evidence, wider ATS/site adapters |
| Candidate information | User-confirmed career facts; separately confirmed summary; education grades; project technology/repository/demo fields; professional profile URLs | Optional role-specific résumé file upload/extraction, richer availability/preferences |
| JD preparation and eye assistant | Full details; saved JD/profile versions; truthful fact selection; PDF/LaTeX; editable answers; optional AI answer drafting with supporting quotes; internal compatibility formula; supplied Letter/LaTeX layout and version-preserving PDF export | conversational correction, safe résumé rewriting, more permitted form adapters, actual ATS parser validation |
| Auto-Apply | No submission engine enabled or implemented; Apply remains manual and Applied is explicitly confirmed | Settings-only opt-in, complete pass/fail/unknown rules, permitted adapters, review/approval, pause/audit and submission receipts |
| Application tracking | Optional known submission date, immutable selected-résumé copy/hash, role category, independent response/OA/interview milestones and history | External-file attachment, multiple attempts per requisition, automated assessment/interview reminders and sourced preparation hub |
| Analytics | Sidebar reports, role/month charts, explicit unknowns, CSV/JSON/print and full streamed history export | Browser/print usability validation; cohort outcome evaluation |
| Nightly newsletter | Opt-in, authenticated recipient, preview, bounded renderer/worker, budgets, idempotency, unsubscribe and failure states | Host sender/account approval, verified domain, nightly task, deployment, bounce/delivery webhooks and actual inbox tests |

Exact acceptance evidence and limits are in handoff/VERIFICATION.md. The supplied layout is implemented; the shared template contains no owner identity. PDF and LaTeX use separate local renderers, so line breaks can differ. No paid service, production database, existing schedule or hosted version was changed. Priority remains a measured permissioned discovery pilot followed by a supported, reviewed submission workflow.
