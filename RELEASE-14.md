# NextRole v14 — trustworthy discovery and application preparation

Status: local review candidate, not deployed. No hosted Site version or production data was changed. Derived from the supplied v13 archive (SHA-256 19edf65d7fae3f3f266742e3cf3ffdf35be7b9656047fe02eda94f45fcc1a024), which records upstream commit 70ae07d0419de03afcece1d34a1907ceb0073d52. The supplied documents describe v12 as live; current hosted state has not been independently verified.

## Delivered phases

### 0A: Security and reproducibility

Next.js and eslint-config-next 16.3.8, Vite 8.0.16, sharp 0.35.5, browserslist 4.29.3, source-map-js 1.2.2, Babel 7.29.6, baseline-browser-mapping 2.11.0 and fast-uri 3.1.8 replace affected versions through explicit compatible pins/overrides. React 19.2.9 and the seven-day supply-chain policy are preserved. PDF export adds the free MIT-licensed pdf-lib 1.17.1 and @pdf-lib/fontkit 1.1.1; bundled Noto Sans carries its SIL license. No paid provider or new runtime secret is introduced.

The final production-dependency advisory scan reported zero findings. This is a dependency database result, not proof that the whole app is vulnerability-free. Development-tool dependencies still require their own ongoing advisory review. Local secret files are excluded before setup, and a non-secret example is supplied. `pnpm typecheck`, `pnpm test`, `pnpm test:scale` and `pnpm verify` are now explicit commands.

### 1A: Discovery correctness

- Whole-place and structured-country matching reject the Indianapolis/India substring case and explicit foreign-country conflicts.
- Experience rules intersect supported lower and upper bounds, preserve evidence, and review contradictory conditions. The parser version is 3. Older cards and alert metadata are repaired from stored source descriptions without changing source timestamps or application choices.
- Shortened descriptions are explicitly incomplete and cannot enter strict recommendations. A 24-hour availability gate moves stale/invalid timestamps into review without deleting records.
- AI fit output cannot replace deterministic eligibility warnings or turn a real JD quotation into a personal credential. Cached output passes the same normalization.
- Successful feed retrievals have their actual check time; feed-sweep membership keeps its separate marker. Retry-After from 429/503 responses is persisted as bounded per-source cooldowns.

### 1B: Extensible and user-assisted discovery

- The provider contracts are registered in `lib/job-feeds.ts`. Host-only source configuration appends Greenhouse, Lever or Ashby employer boards without source edits, retaining existing IDs and checkpoint order. It requires a permission-review URL and explicit host confirmation. Endpoints remain fixed to provider hosts; arbitrary website fetching is not implemented.
- Up to 80 additional boards are supported as an operational budget, not a capacity certification. Large expansions require measured capacity work first.
- Students can import pasted descriptions or one JobPosting JSON-LD object/graph with an application URL. Imports are private, labelled user-supplied, saved to Interested and never called independently verified. Tracking, notes, chosen reminders, preparation, export and confirmed deletion work for imports. They do not generate automatic new-match alerts.
- Re-imports retain application choices. A strong match to an existing shared canonical URL reuses that listing. Separate private copies cannot expose another account's notes or documents.
- Structured compensation retains currency and pay period without conversion. A date-only deadline retains its wording rather than inventing a timezone or instant.
- Coverage cards distinguish distinct active openings, employers, matching/review candidates, stale/unverified listings and incomplete evidence. They do not invent extraction accuracy, broken-link rates or market coverage percentages.

### 2: Verified-fact application preparation

Every job card has a separate eye control. Career facts support education, experience, projects, skills, certifications, achievements, exact wording, dates and links. Confirmation is the user's attestation, not third-party credential verification; edits clear the confirmation. Contact details and facts must be confirmed before use. Stale profile editors and preparation editors cannot overwrite a newer revision.

Preparations retain a versioned job snapshot/hash, career profile revision/snapshot, selected facts, resume content, questions, answers and individual review flags. Generation requests are idempotent. At most 100 private imports and 100 kits per account are retained; versions can be explicitly removed and all personal data is included in export/deletion.

The default route requires no AI key. Optional AI only prioritizes confirmed fact IDs. It receives the JD and verified fact titles/details, excluding dedicated contact fields, account identity, notes and unconfirmed facts. Resume wording, dates and achievements are copied from the saved facts rather than invented or rewritten by the model.

Supported public Greenhouse questions are observed through the documented endpoint and retain source/time. Other questions can be pasted. Suggested practice questions are clearly labelled as not observed. Answers draw from confirmed facts and remain editable/copyable. Authorization, availability, compensation, motivation and personal declarations are not guessed. Changing an answer clears its review marker in the editor.

PDF export is generated inside the application from a professional single-column content model. The matching LaTeX source can be downloaded and compiled with an isolated XeLaTeX/Tectonic toolchain. The hosted PDF is **not represented as a compiled LaTeX result**. Bundled font coverage is checked; unsupported characters return a clear error instead of being silently replaced. Long content wraps and paginates with a 12-page safety limit; users should choose concise facts for a one- or two-page resume.

Preparation never submits an application or changes Applied status. Existing Apply/Applied behavior, account isolation, host authorization, encrypted user keys and no-global-AI-key fallback remain.

## Migration and operation

Append-only migration `0008_career_preparation.sql` creates `imported_jobs`, `career_profiles` and `application_kits` with user-scoped keys and indexes. All original migrations 0000–0007 are unchanged. This migration was applied only to isolated test databases. Production publication requires applying it before the new Worker. Keep the existing Site identity and encryption root. No R2 binding or external document renderer is required.

Continue the existing authenticated maintenance schedule; do not create a second scheduler or anonymous updater. Public feeds and user-requested source checks use no LLM credits. Do not enable a search provider merely because its API is reachable: the intended storage/use license, credentials and budget still need approval.

## Verification and limitations

See `handoff/VERIFICATION.md` for exact final results. The integration suite uses isolated Miniflare D1, synthetic profiles/keys and mocked provider/push responses. The sample PDF was rendered to PNG and inspected, and text extraction confirmed selectable content. Browser QA was unavailable through the supported control-browser workflow, so no preview server or substitute browser installation was used.

Existing global lint debt remains; new feature files pass lint. Real mobile/keyboard/screen-reader workflows, user-provider account access, actual push and schedule execution, production load, hosting quotas/billing and backup restoration remain rollout gates. Full indexed server pagination, independently labelled relevance/accuracy samples and source-run history remain priorities before large catalogue growth.

Automatic discovery still covers configured ATS boards. Private imports broaden user access; they are not a universal crawler. Search-engine ingestion remains gated by source/provider rights, credentials and cost approval. Auto-Apply remains unimplemented and off; unsupported submission success is never claimed. Email digests and advanced career intelligence remain future phases.
