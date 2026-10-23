# Scout PDF flow — 23 October 2026

Scout now accepts a résumé PDF directly through the paperclip, drag/drop or saved-file picker. A staged file card can be previewed and removed before sending. The saved original stays intact in private R2 storage. Uploading or attaching it does not consent to an AI request.

1. Open a saved job, or add a pasted JD in Résumé & JD.
2. Attach a résumé PDF (4 MiB, up to 8 pages).
3. Check JD fit for a NextRole estimate and specific tips. Readable PDF analysis uses browser reading and deterministic code without AI credits.
4. Choose Tailor/Build résumé. Review grouped facts, contacts, dates, grades and links; correct them and confirm accuracy.
5. Download the fixed nextrole-letter-v1 PDF or LaTeX code .txt. The .tex format is also retained.
6. Reopen Edit details or request a factual wording correction. Review approval saves a fresh version; previous prepared PDFs remain available.

## Original-PDF AI reading and conversation

For scanned or complex layouts, Résumé & JD offers Read original PDF with AI. Its separate, default-off checkbox is tied to the selected file revision. The full PDF, including personal contact details and page images, and the current JD can go to the applicant's enabled OpenAI/Gemini connections. Normal text-chat consent never authorizes this action. Routing respects the account's fallback setting, daily/minute limits and provider quotas. Groq is excluded from native-PDF requests. No global provider-key fallback is added. OpenAI receives input_file/file_data and store:false; Gemini receives inlineData. Redirects are refused. This release uses the existing encrypted BYOK storage.

The AI reading and its suggestions are unverified. The user must review any grouped facts before building. Readable-text grouping uses visual PDF rows, preserves wrapped bullets and hyperlink targets, and can still be wrong for unfamiliar layouts. An unknown name is left blank. No missing skill, achievement, date or qualification is invented to increase the score. The score is an internal recognised-skill/structure metric, not a live employer ATS result or hiring probability.

Ordinary AI conversation remains separately consented and uses redacted résumé content, job text and recent messages. It supports reviewed wording proposals with existing source and revision checks. Free guided actions remain available without a provider key.

## Data and compatibility

No migration, sharing change, identity change or new schedule is required. Attachment selection is private to each conversation. Deleting a file also clears cached native-PDF readings; detaching merely changes selection. Master Career facts and Applied/Interested/Not interested choices remain unchanged by PDF checks and attachment-based tailoring. Existing application automation still requires its independent reviews and original Career revision checks; this update does not broaden its permissions.

The existing Letter template and legacy renderers are retained. PDF and LaTeX source are two representations of the fixed template; the service does not execute user-supplied TeX. Original file downloads are separate from generated résumé downloads.

## Verification

The isolated test suite includes real PDF.js reading, actual PDF generation and parsing, original-byte preservation, ownership, malformed/oversized/page-limit handling, visual reading order and hyperlinks, no-text-dump threads, review consent, unchanged master facts, corrected immutable versions, PDF/.txt/.tex exports, scanned-file handling, separate PDF consent, exact OpenAI/Gemini payloads, account-key isolation, fallback off/on and cache deletion. All provider requests are intercepted synthetic fixtures; no student's keys or real applications are used.

Run node --experimental-strip-types scripts/verify-app.mjs --scout-pdf-only for the focused checks, or --scale for full regression and synthetic catalogue/campus exercises. Render an exported synthetic PDF for visual review. Native and Vercel production builds are separate checks. Managed cloud-browser preview currently refuses connections even when the supervisor reports running; visual/device/browser round trips remain unverified. Synthetic load is not proof of production campus capacity.

Official payload references:
- https://developers.openai.com/api/docs/guides/file-inputs
- https://ai.google.dev/gemini-api/docs/document-processing
