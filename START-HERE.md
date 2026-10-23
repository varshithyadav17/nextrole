# Continue NextRole

Current Scout update: read `handoff/SCOUT-PDF.md`. PDFs stay as attachments, with JD fit, review/edit tools, fixed-template PDF and LaTeX .txt exports, and separately consented original-PDF AI reading.

Current visual update: read `handoff/DESIGN-RESTORE.md`. The animated Discovery screen and Scout artwork are restored; explanatory details open on demand. The backend and useful tracking improvements from the focused release are retained.

The latest focused product changes are documented in `handoff/FOCUSED-RELEASE.md`. Start there for the four-section navigation, Today actions, requirement evidence, joining availability and the new migration. Older release descriptions below are retained for provenance; publication status is recorded separately.

This is the Scout chat and Vercel release of the integrated NextRole source. The complete handoff ZIP includes a DEPLOYMENT-RECEIPT.json with the exact Git commit, native saved Site version and deployment result. Earlier v13–v17 documents describe historical milestones; their numbers are not current hosting versions.

Vercel frontend: https://nextrole-scout.vercel.app. It preserves the existing backend and ChatGPT sign-in, rather than copying student identities into a new database. See handoff/VERCEL.md.

Existing public Site: https://nextrole-job-radar.ivorypine64.chatgpt.site. Preserve project appgprj_6ad224df721c8191ba6037935d0477b6, its audience, identity boundary, DB, encryption root, push secrets and saved source checkpoints. No live credentials, student records or production database backup are included.

## Local setup

Use Node 24 and pnpm 11.25.0. From NextRole/:

```sh
python3 handoff/verify-source.py
pnpm install --frozen-lockfile
node handoff/setup-local.mjs
node handoff/migrate-local.mjs
pnpm dev
```

Local identity and generated secrets are development-only. Keep development on loopback. All 14 migrations are supplied; apply only pending migrations to a retained database. The hosting manifest declares DB and private BUCKET storage. See handoff/ENVIRONMENT.md.

## Product workflows

1. Save search preferences and accurate, confirmed Career facts, projects and professional links.
2. Open a job to read its full JD and eligibility evidence. Talk to Scout in the bottom-right corner. Build a factual résumé or check compatibility without AI credits. You can also paste a JD in the general chat; private drafts can be downloaded and removed from the attachment tools.
3. Attach a résumé PDF in Scout, or upload optional role-specific PDF/DOCX/TXT files. PDFs use file cards and previews; DOCX/TXT retain a text review. Optional conversational edits and fact extraction use only the requesting student's enabled API connections after consent; proposals require accuracy confirmation.
4. Download the saved PDF/LaTeX. Apply opens the employer page; Applied records explicit confirmation and the actual selected document. Response, OA and interview milestones are independent. My analytics provides charts and exports.
5. For controlled browser assistance, read companion/README.md and handoff/SCOUT-COMPANION.md. Install the unpacked beta, pair your own account, opt in and queue a saved preparation. Unknown answers, declarations, CAPTCHA and uncertain eligibility stop automatic submission. Real browser validation remains pending.
6. The preparation hub separates official guides, dated candidate reports and original practice. No resource is presented as an exact company PYQ without evidence.
7. Career sources supports private pasted imports. Scout Companion 0.2 uses link + pasted job text on LinkedIn, Unstop, Internshala and other boards. Known employer ATS pages can offer a user-requested structured preview. Read handoff/EXTENSION-BETA.md for installation and explicit Workspace assistance pairing. This is not a global platform feed.
8. Newsletter preview works without a provider. Actual delivery requires the verified sender setup in handoff/EMAIL-ACTIVATION.md. The nightly task must be verified separately from sender configuration.

## Vercel source

```sh
node scripts/prepare-vercel.mjs --out /absolute/empty/nextrole-vercel
```

This creates a conventional Next.js app with pinned dependencies, a bundled PDF worker, server-verified cookies and private API proxy routes. Deploy the generated directory to the retained Vercel project. It is a frontend move; the existing Site still provides authentication, D1, R2 and background work. See handoff/VERCEL.md for the exact boundary and environment names.

## Verification and continuation

```sh
pnpm typecheck
pnpm test:scale
node --experimental-strip-types scripts/verify-live-upgrade.mjs
pnpm build
```

See handoff/VERIFICATION.md for evidence and limitations. A local synthetic load run does not establish campus production capacity. Managed browser control was unavailable, so real device, accessibility and employer-form checks remain release gates for distributing Auto-Apply.

Read PRODUCT-VISION.md, PM-EXECUTION-STATUS.md and handoff/SCOUT-COMPANION.md before extending the system. Keep legacy and nextrole-letter-v1 renderers stable so historical PDFs retain their hashes. Verify the final source snapshot with handoff/verify-source.py before editing it.
# Optional wider discovery

Read `handoff/JOB-DISCOVERY.md` for the new owner-controlled Google Jobs/SerpApi connection. It defaults off and requires a backend server secret plus explicit host activation. It does not use students' AI keys, guarantee platform-wide coverage, or mark indexed leads as verified open vacancies.
