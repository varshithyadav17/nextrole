# Scout Companion 0.3 — current installation and discovery

The normal `/extension` experience is now store-first, with actual listing availability gated by `lib/companion-channel.json`. Job discovery uses a personal recent-match inbox from central connected sources, plus optional background checks and generic desktop notifications while Chrome runs. Automatic welcome and Connect NextRole are implemented; the latter is gated to the real publisher-registered extension ID. ZIP installation is advanced developer testing only. See EXTENSION-DISCOVERY.md and store/LISTING.md for the current scope and remaining store/device/transport gates.

## Historical 0.2.1 guide

Users can open /extension from the sidebar, account menu, Career sources, Help, Auto-Apply settings or landing footer. It includes Chrome/Edge instructions, first-save checks, pairing deep links, troubleshooting and a downloadable manual. The same manual is inside the ZIP as SETUP.txt. Release metadata is generated from the ZIP by scripts/package-companion.py. scripts/verify-companion-distribution.py verifies the actual release files. Popup fallback handles missing/rejected sidePanel APIs and preserves the deliberately launched job tab. HTTP refusal errors keep local drafts and provide a useful next step.

# Scout and application companion

Scout's bottom-right chat is private to the signed-in user and, when opened from job details, scoped to that job. Scoring and résumé building are deterministic. Consented conversation and exact-span résumé fact extraction use the user's enabled encrypted API connections and existing fallback/limits. Email/phone patterns and known credential patterns are redacted; names or other personal facts inside selected text can still reach the chosen provider. Ordinary conversation does not send raw files or API secrets. Separately consented original-PDF reading sends the complete selected PDF and JD to enabled OpenAI/Gemini connections; see SCOUT-PDF.md.

Uploads are optional PDF/DOCX/UTF-8 TXT, up to 4 MiB and 8 PDF pages, 10 originals and 24 MiB per user, with reviewed text up to 50,000 characters. DOCX expansion is bounded. No local OCR is provided; optional original-PDF AI reading can read scanned pages after per-file consent. Original files are private R2 objects; download/delete require the owner. Workspace/career deletion removes originals, extracted text, Scout conversations, tokens and queue records. Submitted application timeline can remain while résumé copies are cleared. Originals must be downloaded separately from the ordinary JSON export.

Conversation retains at most 24 messages per thread and 50 threads per user. Wording proposals require supporting text, current revisions and explicit accuracy confirmation. User corrections can add only the exact statement supplied by that user. No edit silently changes a prior submitted PDF. Compatibility is an explained internal résumé/JD metric, not an employer ATS result or hiring prediction.

## Browser companion beta

The source is in companion/ and the reproducible unpacked package is public/downloads/Scout-Companion.zip. Rebuild with python3 scripts/package-companion.py. It is not a Web Store extension and has not been validated in a real Chrome/Edge/employer flow here.

Users install it themselves, pair a 30-day scoped token shown once, enable both controls and queue an exact saved preparation. Only the token hash is in D1. The extension stores its token locally. It cannot read AI credentials, other students or maintenance APIs. A lost/shared device requires token revocation.

Defaults: queue disabled, auto-submit disabled, 3 automatic attempts/day (user limit 1–10), optional exact employer allowlist, 25 pending entries and one in-flight packet. Packets pin a kit/profile revision and exact PDF bytes/hash. Settings, current job/eligibility and budget are rechecked immediately before authorization. Changing a queued résumé requires review. Claim expiry becomes uncertain, never an automatic retry.

Adapters recognize standard supported fields on Greenhouse, Lever and Ashby hosts. Unknown required questions, unresolved eligibility, stale availability, declarations, checkbox/radio/custom controls, conflicting prefilled answers, invalid forms and CAPTCHA block automatic submission. The browser must stay open. It fills supported fields for review when submission is off. A new employer confirmation observed after the attempt is required before recording Applied. This is a candidate-browser observation, not a cryptographically verified employer receipt. If the result is ambiguous, inspect the employer page before any manual retry. Pause/revoke cannot recall a click already sent.

The exact claimed PDF remains recordable after a draft edit, source closure or pause following an authorized submission; it never gets replaced with a newly edited draft. A revoked/expired token cannot send additional receipts. Preserve manual Applied, Interested, Not interested, notes and milestones.

Version 0.2 adds a persistent side panel, up to 20 local drafts, consent-scoped single-job lookup and confirmed manual tracking. LinkedIn/Unstop/Internshala and unknown boards use link + pasted text, without DOM reading. A user-requested employer ATS preview reads one embedded JobPosting JSON-LD object. Read EXTENSION-BETA.md for the current install and capability contract. It previews before saving a private unverified import. It does not read messages, bypass login/CAPTCHA or create a global LinkedIn/Unstop feed. Missing structured data falls back to ordinary pasted import.

Before campus distribution test real navigation, field labels, file upload, pause/revoke, interrupted tabs, success/validation screens, keyboard and mobile flows in an applicant-owned or controlled test environment. No actual employer applications were sent during this development run.
