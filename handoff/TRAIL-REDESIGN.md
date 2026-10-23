# Trail redesign — implementation draft

The owner selected the Trail direction and requested a formal Scout carrying a file. The source implements that direction across the student workspace, dedicated ScoutX conversation, job detail/application surfaces, preferences, landing/sign-in and admin analytics.

This draft is not a production rollout. Browser visual verification is blocked; see [design QA](../design-qa.md). The existing deployed version remains the release baseline.

## Visual targets

- [Selected whole-product concept](../docs/design/trail-selected-board.webp)
- [Refined Jobs screen with formal Scout](../docs/design/trail-refined-jobs.webp)

These are design concepts, not implementation screenshots or evidence of real listings/users. The reference copies use lossless WebP encoding without resizing.

## Implemented surfaces

- `app/trail.css` supplies ivory, tangerine and teal tokens, spacious white fields, readable type, short row actions, responsive layouts and consistent admin/chat surfaces. The tangerine primary control is darker than the illustration orange for readable white labels.
- `app/trail-scout.tsx` separates the landscape and formal character. Scout carries a file, enters the header, and responds to a greeting. A distinct running character accompanies real pending work without a fabricated percentage.
- Job lists retain requirement evidence, source attribution, saved/applied/dismissed choices, restore and application-stage controls. Filters expand on request. View job still opens the dedicated page, and opening an employer page remains separate from confirming Applied.
- `?tab=scout` opens the same authenticated conversation as a full-page assistant. The floating companion remains available on other student pages and job details. Chat preserves PDF attachments, existing provider consent, reviewed corrections and draft history.
- Admin retains its owner-only aggregate metrics, synthetic-demo disclosure, report exports and feedback workflow. Chart colours follow Trail. New Scout navigation/active-time labels join the existing first-party analytics allowlist.
- Existing account menus, sign-in/linking, notification preferences and data permissions remain in place.

## Motion and performance

The formal character has a short entry and a greeting response. The running character moves on one indeterminate loading track only while work is pending. Buttons and rows have restrained hover feedback. Motion follows the existing pause control, device reduced-motion preference and document visibility state.

The three production illustrations are separate transparent raster WebP files, about 108 KiB combined instead of the 2.5 MiB generated PNGs. The hero is 512 px wide, runner 160 px and backdrop 1440 px. Original generated artwork is not substituted with code-drawn illustrations. UI icons reuse the product's existing icon system.

## One-page résumé behaviour

`lib/resume-one-page.ts` renders the real PDF to measure page count. It keeps the supplied Letter template and 10 pt body, with no clipping, font squeezing or invented claims.

New preparations select whole reviewed facts in relevance order until the rendered draft fits one page. The highest-ranked education, skill and work/project evidence remain when available. Omitted facts are disclosed in the draft and remain in the profile. If essential content itself is too long, Scout asks the user to shorten it instead of claiming success.

The policy is enforced again before saving edits to a one-page preparation. The Scout artifact checks layout before enabling PDF/LaTeX downloads and offers an inline PDF preview. An explicit one-page request can create a separate version from an earlier draft, leaving the original preparation and submitted résumé copies intact. Original uploaded PDFs are not modified. Questions and negated instructions do not trigger a one-page conversion.

The page badge describes the rendered PDF. Exported LaTeX keeps the supplied source template; independently compiling it with different fonts/engines can change pagination. The compatibility indicator remains an internal résumé/JD estimate.

## Evidence and remaining gate

- TypeScript checking passed.
- The isolated existing regression suite passed 1,006 checks; 26 separate Worker adapter checks also passed.
- `node --experimental-strip-types scripts/verify-one-page.mjs` passed 34 checks, including fixed template fidelity, true one-page output, unchanged facts, essential-content overflow refusal and byte-identical historical PDF rendering.
- The native production build and the generated Render-forwarding Next.js frontend production build passed, including frontend TypeScript checking.
- `app/design-preview` is a development-only, browser-memory fixture. Production returns 404. It intercepts fixture API calls locally and cannot establish identity, access account records or forward an action to a production API. Its mock responses are not evidence of backend/UI integration.
- Browser interaction, screenshots at desktop/mobile sizes, console review and visual comparison remain blocked. No successful browser verification or completed rollout is claimed.

## Resume the review

Open the local development fixture with the supported preview browser when access is restored. Compare Jobs to the refined target and inspect ScoutX, Applications, Preferences and the public synthetic admin demo. Check the mobile drawer, account menu/logout, filters, job/back navigation, save/restore/Applied, chat input, PDF upload/preview, one-page overflow, motion pause and device reduced motion. Save real captures and complete `design-qa.md` before merging or deploying this redesign.
