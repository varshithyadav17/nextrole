# NextRole authentication and live analytics

Updated 10 November 2026.

## Account flow

Production offers email/password sign-in, account creation with name, email, password and confirmation, password visibility controls, and Google. Existing authenticated users can add a password in Your account. Password linking retains the current workspace ID.

The Node authentication service uses salted scrypt, signed single-use credential exchanges, durable attempt limits, origin checks and Secure HttpOnly session cookies. New email registrations receive their own namespace and cannot gain admin access by claiming an owner email. Google verifies email ownership. A verified Google account matching the configured owner email can access the admin dashboard.

Google callback requests now use the current data-service address after the Site domain changed. Signatures, session issuers and workspace IDs keep their original identifiers. Existing account data stays associated with its original workspace.

Email verification and password-recovery emails are pending. Separate existing accounts require an explicit signed-in linking flow.

## Admin analytics

Admin pages and JSON/PDF exports query the operational database. Old mode=demo URLs use recorded data. The public sample analytics route redirects to authenticated admin.

The dashboard refreshes while visible and when returning to its tab. It shows its date range and last update time. Failed refreshes display an error with the previous timestamp. Activity time remains an estimate, and applications are user-confirmed.

The connected database contained 4 profiles, 5 observed participants, 365 product events and 0 feedback rows before verification. These are separate record counts. Earlier reviews require their original data source or export.

## Deployment and verification

The merged source is in varshithyadav17/nextrole. Vercel serves https://nextrole-scout.vercel.app. The existing nextrole-backend Render service handles authentication and API forwarding. The original Site retains D1/R2, maintenance and scheduled operations.

Data-service version 42 applied additive migration 0016_email_password_accounts.sql. The email activation flag is enabled on Render. The current owner-access update is published through the same data-service workflow.

Verification completed during this rollout includes TypeScript, isolated workflow and Worker transport checks, 37 Node email gateway checks, 19 generated Render/frontend boundary checks, production builds, and browser review of sign-up switching and password visibility.

Live checks confirmed enabled email/Google methods, invalid signup rejection, incorrect/unknown password rejection, cross-origin rejection, protected admin/report routes, and Google's authorization page with no provider configuration error. Real-account Google consent and callback completion require the account holder. Successful signup and password login were exercised with isolated database fixtures.
