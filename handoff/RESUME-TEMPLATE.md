# Résumé template contract — nextrole-letter-v1

## Data and layout

lib/resume-template.ts contains the user-supplied layout's preamble verbatim, without the example candidate's personal content. lib/career.ts builds the structured document from the saved, confirmed profile. The profile is not imported or published merely because a layout was supplied.

| Template content | Career profile input | Inclusion rule |
| --- | --- | --- |
| Centered name and contact header | Name, email, phone, optional professional URLs, location and portfolio | Confirm contact information; labels link to the saved addresses |
| Profile | Optional Professional summary | Separate summary confirmation; editing clears it in the UI |
| Education | Title = degree/qualification, Organization = institution, Dates, Grade/score | Select the confirmed education fact; grade wording is never inferred |
| Technical Skills | Skill fact title = group label, detail line(s) = actual skills | Select the confirmed fact; missing JD skills are not added |
| Experience | Existing experience facts | Optional section after skills; retains the existing product capability |
| Projects | Title, optional organization/dates, Technology line, details, repository/demo/evidence URLs | Selected confirmed projects only |
| Certifications and Achievements | Existing facts, dates and details | Selected confirmed facts only |

The document uses plain verified text. Arbitrary user TeX and rich formatting commands are escaped, not executed. Bullet descriptions keep the user's words. No automatic shortening, rewritten metrics, invented summary or unsupported skill enrichment is introduced. The internal compatibility check includes rendered summary and project/experience technology text; its existing limitations still apply.

New preparations pin template=nextrole-letter-v1. Unversioned preparations use lib/resume-pdf-legacy.ts, preserved byte-for-byte from v16. Editing their fact selection retains that renderer and document structure. Downloaded and stored submitted copies are byte-identical for a saved preparation; correcting an application date/role does not replace its PDF. The generated PDF's creation/modification metadata uses the kit's original creation time.

## Export and local compilation

The worker produces a PDF locally with the existing pdf-lib/fontkit dependencies. It does not run a TeX executable or send a résumé to a hosted compiler. PDF and LaTeX share the saved content and layout design, but are separate rendering engines; exact line breaks and font metrics are not guaranteed to match.

The generated LaTeX uses the supplied article/fullpage/titlesec/hyperref/enumitem/microtype packages. The synthetic Latin fixture was compiled successfully with the installed pdfLaTeX (TeX Live 2022/Debian), without shell escape:

```sh
pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error NextRole_resume.tex
```

Other scripts can require a suitable Unicode TeX engine and explicitly chosen fonts; the unchanged supplied preamble does not provide universal script support. The built-in PDF uses supported Noto fallback and rejects unsupported characters explicitly. Raw uploaded TeX execution and a general-purpose compilation service are not implemented.

Text/URLs are escaped independently. Only permitted web links and contact mailto addresses become annotations; file/javascript/private-network links and mail header injection are refused. Break opportunities in very long displayed words do not change the actual hyperlink destination. Ordinary résumé export performs no HTTP or AI request.

## Fonts, bounds and storage

The new renderer embeds unmodified Latin Modern Roman regular, bold and italic fonts to follow Computer Modern's serif design. Assets, GUST/LPPL license texts, upstream readme/manifest and complete-source links are in vendor/resume-fonts/latin-modern/. lib/resume-serif-fonts.ts represents the same asset bytes as base64. The earlier Noto assets remain unchanged for old documents and supported fallback.

The pinned fontkit's CFF subsetter failed on real fixture text. Its full-font path also misidentifies these OTFs as TrueType in pdf-lib's dictionaries. The new renderer therefore embeds these three fonts intact, flushes them, and sets their PDF FontFile3/OpenType stream and CIDFontType0 metadata through public PDF object APIs. Noto/legacy fonts are untouched. Regression checks inspect the dictionaries; Poppler text extraction and rendering report no warnings. Do not remove that handling merely because PDFDocument.load succeeds.

The reference portable PDF is 192,642 bytes, its Unicode variant 198,858 bytes and a three-page stress fixture 194,730 bytes. A base64 submitted copy of the reference PDF occupies 256,856 bytes before JSON/document metadata. This is a concrete storage increase, not a production capacity claim. Review D1 storage, retention/export volume and possible separately approved object storage before scale or deployment.

Letter dimensions are 612 × 792 PDF points. Content follows the supplied 0.5-inch sides and approximately 0.35-inch top/bottom, allowing font descenders at the text-block edge. TeX microtype can protrude punctuation slightly beyond its text box. The four final fixtures kept all characters in a safe page area, with no clipping or blank pages. The native exporter paginates instead of squeezing content and refuses over 12 pages.

## Future changes and rollout

Do not change the rendering contract of nextrole-letter-v1 or the legacy renderer for existing preparations. Introduce a new template ID and retain earlier dispatch paths for future layout/font changes. Stored submitted PDFs are immutable copies; template IDs also protect preparations that are rendered on demand.

No migration, new environment variable or provider is required. Production and browser validation remain separate rollout gates. A rollback to older profile write handlers can strip fields they do not understand; preserve summary/grade/technology data and v16 private-document cleanup/export handlers if any such data has been created. Never drop application history to roll back a layout change.
