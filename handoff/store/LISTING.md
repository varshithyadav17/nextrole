# NextRole Scout Companion — publisher submission draft

Status: not submitted. No store listing, approval, publisher account, installation count or rating is claimed.

Name: NextRole Scout Companion

Summary: New job matches, optional desktop alerts and reviewed application assistance for your NextRole account.

Single purpose: Help a NextRole user discover, prepare for and track suitable job opportunities from the browser.

Description:

Scout brings your recent NextRole job matches beside your browser. Connect your own account, choose background job checks and optionally allow desktop notifications. Review an opening in NextRole to read its requirements, prepare a factual résumé with Scout and track your next step.

- Recent personal match alerts are rechecked against current experience, graduation, location and other supported preferences.
- Applied, Interested and Not interested openings do not appear as new matches.
- Checks run about every 15 minutes while Chrome is running. Connected employer and public feeds refresh centrally on NextRole's schedule.
- Save reviewed job text and its original link privately; keep up to 20 explicit drafts in your browser.
- Supported employer ATS pages can offer a user-requested structured preview.
- Optional application assistance uses the exact résumé and answers you queue. It starts paused. Automatic submission needs separate authorization and stops for unknown answers, declarations and CAPTCHA.

Automatic LinkedIn, Unstop and Internshala feeds are not connected. Scout does not crawl or automate those sites. Saving an individual posting uses text deliberately pasted by you. Source coverage is limited to NextRole's connected sources. Unknown eligibility stays in Needs review in the full app. Résumé compatibility is an internal indicator, not an employer ATS guarantee. Desktop notification timing depends on browser/device settings and source updates.

NextRole account required. Desktop Chrome 116+; compatible Edge can be tested separately. Basic matching, tracking and extension checks need no AI API key. Optional website AI features use the user's own provider connection and consent.

Website: https://nextrole-scout.vercel.app/extension
Privacy: https://nextrole-scout.vercel.app/privacy
Support: https://nextrole-scout.vercel.app/?tab=settings&settings=help

## Permission explanations

- storage: scoped connection, settings, bounded cached matches/deduplication keys and explicitly saved local job drafts. Trusted extension contexts only.
- alarms: bounded background inbox checks and separately enabled application queue checks while Chrome runs.
- sidePanel: show the user's job inbox and review controls beside the active tab.
- activeTab: read the current HTTPS job link after the user clicks Scout; it does not read browsing history.
- scripting: user-requested JobPosting preview and separately authorized field assistance on supported employer ATS pages only. No scripts on LinkedIn, Unstop or Internshala.
- notifications (optional): request at the user's explicit toggle, then show a generic count of new matching openings. Matching still works without it.
- native NextRole host: verify scoped connection, retrieve personal matched alerts and approved queue packets, save reviewed jobs and confirmed tracking changes. Ambient cookies are never forwarded.
- Greenhouse, Lever and Ashby hosts: known employer ATS adapters. Does not confer permission for restricted boards.
- externally_connectable: the exact NextRole web origin can complete a one-use, five-minute connection challenge. The website must allow only the real publisher-registered extension ID. No wildcard website origins.

No remote executable code. No history, cookie, inbox or student AI-key permissions. No advertising, sale of user data or unrelated browsing analytics. Use of data is limited to the disclosed job-search purpose; the owner must confirm these declarations accurately in the store privacy form.

## Still required before submission/release

1. Owner registers/signs into the Chrome Web Store developer dashboard and pays any required registration fee. Do not request passwords or payment information in chat.
2. Upload `Scout-Companion-Store.zip` as a draft to obtain the actual extension ID and public key. Record that ID in `lib/companion-channel.json`; add the dashboard's public `key` to the manifest for stable local release testing if supplied. Do not guess an ID or mark it approved.
3. Rebuild the package, test normal connection and matching on real Chrome/Edge with the native service reachable. Existing automated HTTP testing encountered native 403/error 1010; do not disable identity checks or use a bypass token as a user to work around it.
4. Add actual product screenshots from that installed release, category/language, owner support contact and privacy declarations. Do not use a fabricated installation screenshot or invented review credentials.
5. Test fresh install, update, browser restart, denied/revoked notifications, expired/revoked connection, disconnect, strict eligibility and tracked duplicates. Use a consenting test account; no real applications need to be submitted for this flow.
6. Submit for Google's review. Only after approval set `chromeStoreApproved: true`, rebuild and publish the NextRole website. Its Add to Chrome button then points to the actual listing and Chrome handles installation and updates.

Official references:
- https://developer.chrome.com/docs/extensions/how-to/distribute
- https://developer.chrome.com/docs/webstore/register
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/program-policies/limited-use
- https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software?lang=en
