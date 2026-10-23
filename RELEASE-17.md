# NextRole v17 — supplied résumé template

Status: local review candidate, not deployed. Parent: the exact v16 handoff, SHA-256 847e3cd9689a1a7ce48bf59b4040de39fa9b2abe54c2e47a41d3153fbf6a7761, local commit 3163d0a9f6efbf0fb336ed4b899101267e9c56e9. This phase implements the layout subsequently supplied by the user. The discovery and application priorities remain unchanged.

## Acceptance and delivered behavior

- New preparations use a versioned US Letter résumé layout with a centered serif header, compact bullets, ruled sections and linked professional/project labels. The LaTeX export keeps the supplied preamble, geometry and section/bullet configuration. The portable PDF follows that design; it is not server-compiled TeX, and line breaking/typography can differ.
- Career profile adds an optional, separately confirmed Profile paragraph, an education grade/score field and a project technology line. Skills can be entered as named groups. Only confirmed summary text and selected confirmed facts enter new documents; missing sections stay absent. Each candidate supplies their own identity. No personal content from the owner's pasted example is included as a shared default or seeded into an account.
- PDF links are actual URI annotations. Long names, contact strings and details wrap or paginate. Nothing is shortened or removed to force one page. The existing 12-page budget fails clearly instead of truncating. Supported character fallback is retained; unsupported glyphs give a recovery message.
- Earlier unversioned preparation PDFs retain the exact v16 renderer and LaTeX layout, including when the owner updates a saved preparation. Already submitted PDFs remain stored copies with their existing hashes. Create a new preparation to use the new layout for an older job.
- LaTeX text is escaped, displayed long tokens get safe break opportunities and hyperlink targets stay data. No user-supplied TeX executes in the app. No external résumé processor, new AI call, package dependency, account, paid plan or infrastructure was added.

See handoff/RESUME-TEMPLATE.md for field mapping, local compilation, font details, future versioning and storage implications. The representative PDF measured 192,642 bytes; full serif fonts are retained because the pinned CFF subsetter is unsuitable. A base64 submitted copy is about 257 KB before record metadata. Production storage/retention capacity still needs review before rollout; no live storage cost was incurred here.

## Verification

Full pnpm verify passed: **665 checks**, TypeScript and production build. Feature-file ESLint passed. Whole-project lint retains 45 errors and 20 warnings. The representative portable PDF and the downloaded LaTeX compiled with local pdfLaTeX each fit one Letter page. A three-page overflow fixture and a supported Unicode fixture were visually inspected. Text extraction, links and safe page bounds passed, and the final PDF readers/renderers reported no font warnings. See handoff/VERIFICATION.md for practical limits and reproducible evidence.

No database migration is needed for these backward-compatible JSON fields. All migrations through 0011, the database schema, dependency graph and hosting identity are unchanged from v16. No production deployment, email activation or schedule change occurred.

## Remaining product work

Role-specific PDF/DOCX résumé import, conversational correction and evidence-checked résumé rewriting remain pending. This phase implements the supplied layout, not those features. Universal platform coverage, Auto-Apply and sourced company OA/interview research remain as recorded in PM-EXECUTION-STATUS.md. The résumé compatibility check remains an internal text assessment, not an official employer ATS score or hiring prediction.
