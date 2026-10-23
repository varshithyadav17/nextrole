# Scout Companion 0.3 — discovery inbox and store release preparation

The primary experience is now My matches: recent personal alerts from NextRole's connected sources, rechecked for current eligibility and tracking. Background checks and desktop notifications are separate opt-ins; the first check is quiet. The normal installation will use Chrome Web Store, automatic welcome and Connect NextRole, with a one-use challenge and publisher-registered extension ID. No approved listing exists yet. The website labels store availability honestly and keeps this ZIP under developer testing. See handoff/store/LISTING.md and handoff/EXTENSION-DISCOVERY.md in the project source.

For intentional unpacked testing, enable **Allow Matched-job inbox access** when creating a fresh token in NextRole and paste it under Connection → Developer beta. Existing Workspace-only tokens keep their original access. The installation/capture/queue detail below remains applicable; its Workspace-only connection does not grant the new inbox.

A Manifest V3 companion for NextRole. Requires desktop Chrome/Chromium 116+ or a compatible Edge release. This is an unpacked, developer-mode package, not a published Chrome Web Store extension. No paid service or student AI key is required for capture, preference checks or tracking.

## Install and pair

The visual guide is at https://nextrole-scout.vercel.app/extension. SETUP.txt inside this ZIP contains the same step-by-step manual and troubleshooting; it can be read offline.

1. Extract Scout-Companion.zip into a permanent folder. Open chrome://extensions (or edge://extensions), enable Developer mode, choose Load unpacked and select the extracted folder containing manifest.json.
2. Sign into your own account at https://nextrole-scout.vercel.app. Go to Preferences → Auto-Apply → Install and pair the browser companion.
3. Explicitly tick **Allow Workspace assistance**, then create a pairing token. Copy the token once. Creating a new token invalidates the previous one; the token expires in 30 days.
4. Pin the extension. Click its icon → Open Scout panel → Connection. Paste the token and choose Verify & pair. This verifies the token with NextRole and leaves queue assistance paused.
5. Do not paste an AI API key, a LinkedIn password or a Site bypass token. Revoke a lost/shared-device token from NextRole. Disconnect only removes the credential in this browser.

Existing 0.1 tokens retain their old limited capabilities. A fresh explicitly consented pairing is needed for text imports, single-job lookup and manual tracking. Pairing does not enable application automation.

## Save a job from any public HTTPS job link

Click Use the current job page or paste its original URL. LinkedIn, Unstop, Internshala and unknown websites use **link + text you paste yourself**. Scout neither reads nor automates those boards. It does not create an unrestricted job feed or bypass site terms, login walls, CAPTCHA or rate limits.

On an individual supported Greenhouse, Lever or Ashby employer page, your deliberate click can preview exactly one embedded JobPosting object. Missing or ambiguous structured data falls back to pasted text. Review the title, employer, location and full JD, including experience, eligible batches and academic requirements. Leave unknown fields unspecified.

Tick the accuracy/save confirmation, then Save to NextRole. Imports remain private and availability-unverified. Known canonical duplicates reuse the existing job; Applied, Not interested, notes and history are preserved. The companion does not silently restore ignored jobs.

Check this link in my NextRole returns only that job’s summary and deterministic match against saved preferences. It does not run an LLM or fetch the linked website. Open Scout opens that exact job in NextRole’s existing signed-in résumé/chat workspace. Résumé/JD compatibility is an internal metric, not an external ATS guarantee. Optional AI conversation uses the app’s own explicit consent and account-specific provider routing.

## Local drafts and tracking

Keep up to 20 explicit job drafts locally when offline. The unfinished form is saved for the browser session. Drafts never upload automatically. Reopen, review your current pairing and save each deliberately. Delete drafts in Connection; uninstalling removes local extension storage. Disconnecting keeps drafts.

Interested and Not interested update the current job after your click. I’ve applied requires a second confirmation that you actually submitted on the employer site. A click or autofill does not mark Applied. Stale changes are rejected; recheck the URL before trying again. Applied can only be reversed deliberately in the main app.

## Reviewed application queue

This is separate from saving jobs. Both the website and extension queue switches start off. Build and save an exact résumé in NextRole and queue its preparation for a supported employer ATS source. Only independently ingested ATS jobs qualify; imported board jobs do not.

Default: 3 automatic attempts/day (configurable 1–10), at most 25 pending, one in-flight packet. The browser must remain open. Automatic submission requires a separate explicit website opt-in. Otherwise supported fields are filled for your review. Unknown answers, unresolved eligibility, stale availability, declarations, checkbox/radio/custom controls, conflicting fields and CAPTCHA stop automatic submission. Scout never answers personal declarations for you.

The server rechecks the packet and website pause state immediately before fill and submit. The extension rechecks the local switch/token at those points. Critical fill/submit messages are never replayed after a lost response. A newly observed employer confirmation is required for automatic Applied; an ambiguous result stays uncertain and is never retried automatically. Pause or revoke cannot recall an already sent click. Check interrupted attempts in the employer tab before clearing the local pointer.

## Permissions and privacy

- activeTab: current page URL after invoking Scout; no tabs/browsing-history permission.
- scripting + five explicit employer ATS hosts: the user-requested structured preview and supported queued form adapter. No LinkedIn/Unstop/Internshala host permission.
- one fixed NextRole backend host: scoped Bearer-token requests with no ambient cookies or redirects.
- storage: local pairing token and job drafts, restricted to trusted extension contexts; session-only unfinished form/active packet.
- sidePanel: the persistent Scout panel. alarms: checks an explicitly enabled queue once per minute while the browser runs.

No cookies/passwords, inbox permission, all_urls, remote code, cross-user access, student API-key access or owner-maintenance access. The server stores only the pairing-token hash. Website text is untrusted; drafts render as text. No actual employer application was sent during development.

## Validation and next gate

Node behavior tests cover page policy, sender security, network identity, draft bounds, pause and lost-submission recovery; isolated backend tests cover consent, token revocation, student isolation, canonical duplicates, experience filtering and tracking preservation. The local browser preview checks the panel at 345 px, local drafts and single-job handoff using a mock Chrome API.

Actual Chrome/Edge installation, native sidePanel opening, real ATS file input/validation/confirmation and store publication remain manual release gates before campus-wide distribution. Use a controlled employer test form or consenting applicant; do not submit real applications just to test. Source: companion/; deterministic package: scripts/package-companion.py.
