# NextRole ownership and storage handoff

## Current production architecture

| Component | Current service | Independence status |
| --- | --- | --- |
| Frontend | Vercel, `nextrole-scout.vercel.app` | In the connected owner's Vercel account |
| Authentication and API gateway | Render, `nextrole-backend-8zfv.onrender.com` | In the connected owner's Render account |
| Durable relational database | Cloudflare D1, SQLite, binding `DB` | Provisioned and managed by ChatGPT Sites |
| Private files | Cloudflare R2, binding `BUCKET` | Provisioned and managed by ChatGPT Sites |
| Storage API and owner tools | Site Worker | Still depends on the existing Sites service |
| Canonical code | `github.com/varshithyadav17/nextrole` | In the owner's GitHub account |
| Refresh and digest scheduling | Owner-authorized ChatGPT automations | Must move to an independent scheduler during migration |

This is not MongoDB. The current deployment is not yet fully independent of Sites. A Vercel frontend and Render gateway alone do not migrate the database, files, secrets or scheduled work. Subscription expiry behavior is not assumed or guaranteed by this document.

## Workbook imports

The owner-only **Admin → Imported data** screen contains historical workbook snapshots, source provenance, source quality notes, normalized users and reviews, computed analytics, and private backup downloads.

- `analytics_imports` stores immutable import manifests, completion state and computed reports.
- `analytics_import_rows` stores every nonempty row's original cells and formulas, keyed by import, source checksum, sheet and Excel row number.
- `analytics_import_pages` records checksummed upload pages for safe retries.
- R2 stores byte-identical original XLSX files under `analytics-imports/<import-id>/<source-sha256>.xlsx`.
- Reimporting the same file set does not duplicate records. Different workbooks remain separate snapshots; matching names do not establish identity.
- Source password placeholders are retained only in explicit private source exports. They never become authentication credentials. Imports do not subscribe anyone to emails or inflate live telemetry.
- Year-only dates remain intact. Full activity dates can be recovered only where record IDs explicitly encode them. Imported retention uses exact day 7 after first observed activity; directory-only sources use their existing status flags. No registration trend or ordered conversion is manufactured.

Use the Python standard-library parser without modifying the workbooks:

```sh
python scripts/prepare-analytics-import.py --out /private/path/import-packets file1.xlsx file2.xlsx
```

Keep its output private and outside Git. An authenticated owner calls the Site MCP `nextrole_import_analytics` tool with JSON-string payloads in this order: `begin` with `manifest.json`; `file` once per source with `{id, source, data}` where data is the full original file in base64; `append` for each packet from `pages.json`; then `finalize` with `{id}`. `status` reports progress. No write is allowed without the verified owner identity. Original source files and page hashes are checked before completion.

When a client cannot yet discover the new MCP command, an owner can temporarily configure `NEXTROLE_ANALYTICS_IMPORT_SCOPE` with the import ID, SHA-256 of the exact manifest text, and expiry timestamp. The existing owner-authenticated maintenance tool then issues a 15-minute upload capability for that source set. `scripts/upload-analytics-import.py` reads that token from hidden stdin and submits to `/api/host/imports/upload`. This is not a login session or an admin permission: other imports, different manifests, changed source bytes, and account operations are rejected. Finalization revokes the capability. Remove the temporary runtime scope after transfer. Never commit a scope token, source rows or original files.

## Next migration: storage into the owner's account

The smallest change is to keep the SQLite model and move the D1 database, R2 bucket and storage Worker into an owner-controlled Cloudflare account. This avoids rewriting the application around MongoDB or changing the existing user IDs. PostgreSQL is another option, but requires a deliberate data-access and SQL migration.

1. Provision D1 and a private R2 bucket in the owner's Cloudflare account. Deploy the current Worker source with the same binding names and required environment variables/secrets; do not put credentials in Git.
2. Export **every** production table from the existing D1 database and copy all private R2 objects, including resumes and imported workbooks. An analytics JSON export is not a full application database backup. Preserve object keys, account IDs, password hashes, decisions, schemas and migration history.
3. Rehearse the restore separately. Verify table counts, source checksums, saved applications, resume ownership, Google and email login, admin access and private downloads. Keep live writes on the old database until the final cutover window.
4. Copy the latest records during a controlled write pause, update the storage network origin on Render/Vercel, and preserve the original session issuer while existing sessions are accepted. The storage network URL and identity issuer have separate purposes. Retain both bridge secrets only as necessary for the existing frontend/backend migration path.
5. Move refresh and digest jobs to an owner-controlled scheduler that calls authenticated maintenance endpoints. Preserve opt-ins and delivery idempotency. Do not expose an unauthenticated maintenance or import endpoint.
6. Verify the public app and background work from the new infrastructure, then remove the old dependency only after a successful cutover and retained backup. Record a rollback route before switching writes.

The account migration is a separate operation after the workbook import; this change does not claim that it has already happened.
