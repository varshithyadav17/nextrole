# NextRole source import audit — 14 November 2026

Observed at 2026-11-14T11:13:11.497Z. Source data comes from the owner-authorized maintenance status; the counts describe public job imports.

- Catalogue: **11,702 active/open listing records**.
- Saved source sweep: **103/103 checked**, complete.
- Latest source checks: **92 healthy, 11 needing attention**.
- Additional employer feeds with completed imports in this expansion: **23**.
- Original supplied list: **46/260 configured; 35/260 with a successful latest import**. The baseline was 17 successfully connected requested brands.
- **Revvity: 28 India listings imported**, checked 2026-11-14T11:05:30.181Z. It is an individually requested employer outside the original 260-brand list.
- Delivery: no pending/failed push rows; the current alert sweep is complete.

[All 103 configured source feeds](SOURCE-IMPORT-STATUS-2026-11-14.csv) · [All 260 originally requested companies](REQUESTED-COMPANY-STATUS-2026-11-14.csv)

## Outstanding provider checks

| Companies | Observed result | Retained state |
| --- | --- | --- |
| Applied Materials, Mastercard, Wells Fargo, Thomson Reuters, Fidelity Investments, Autodesk, Target, Bank of America | HTTP 303 to `community.workday.com/maintenance-page`; all eight destinations were checked without following them | Configured for future checks; no first import claimed |
| Microsoft | HTTP 429 | 100 of 216 index rows processed; checkpoint retained |
| Walmart Global Tech | HTTP 422 | First import not validated |
| Paytm | Feed timed out | Previous data preserved; last completed import recorded 202 rows |

Workday's [maintenance page](https://community.workday.com/maintenance-page) reports a service interruption. It does not supply a restoration deadline. No source challenge, login or authorization was bypassed.

## Definitions and verification

The catalogue number is the database's active/open row count. Provider copies can repeat. Personal matches depend on preferences and checked requirements. Rows in the last complete import are source records; they are not cross-source unique-job counts. A processed-row count for a deferred import is separate from a completed import.

India-scoped sources and global employer boards are labelled separately in the sheets. Student preferences apply after shared collection. Unknown requirements stay in Needs review. A configured company name alone does not count as a successful connection.

The stored catalogue sync marker is 2026-11-14T11:02:27.812Z; it represents the saved sweep's start. Individual last-check times are recorded in the source sheet. Existing Applied, Interested, Not interested, notes and application history were preserved.

Validation: 1,284 isolated regression checks, 28 native Worker importer checks, 210 focused company-feed checks and TypeScript checks passed. Public checks returned Vercel HTTP 200, Render health HTTP 200, Google sign-in ready, and HTTP 401 for an anonymous private source-directory request.

The frontend is live at [NextRole](https://nextrole-scout.vercel.app). The sheets distinguish completed imports, configured feeds and remaining targets.
