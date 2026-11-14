# Employer coverage and import scope

Updated 14 November 2026. Configuration counts describe code, not successful production imports. The app's source health and owner maintenance status are authoritative for the last import.

The supplied master list contains **260 distinct requested brands**. This release configures **46 of those brands**, up from 17, across 102 source configurations and 100 employer brands overall. The full [260-row source map](REQUESTED-COMPANY-COVERAGE.csv) includes every remaining gap. A company name in the directory is not a working importer.

## Newly configured employers

| Public career system | Employers | Collection |
| --- | --- | --- |
| Greenhouse | Databricks, Cloudflare, Thoughtworks, HighRadius, Glance | Stream the employer board; retain explicit India locations and full descriptions. Cloudflare's posting-location metadata is included. |
| Lever | Spotify, Nium | Traverse public posting pages; retain India jobs. |
| SmartRecruiters | ServiceNow, Nagarro, Continental, Western Digital, Arista Networks | Exact-country index plus validated public posting details. Nagarro uses its current `Nagarro1` board. |
| Google Careers | Google | Parse published career-page JSON arrays and public job URLs, without executing scripts or retaining sign-in links. |
| Amazon Jobs | Amazon | Traverse the public India search results with full qualifications and stable requisition IDs. |
| Microsoft Careers | Microsoft | Public career search plus public posting details. |
| Workday | Salesforce | Discover and checkpoint the exact India country facet, then retrieve public posting details. |
| Oracle career portals | Oracle, JPMorgan Chase | Exact India location IDs, paginated requisitions and allowlisted public description fields. This is career-portal collection, not a partner integration. |
| Kula | MoEngage, CleverTap, Cashfree Payments | Public job links and published JobPosting structured data; retain India jobs. |
| Trakstar Hire | Whatfix, Exotel | Documented public frontend opening lists and full descriptions. |

Nium, Arista Networks and Exotel are useful additions outside the original 260. They do not increase the requested-brand numerator.

Nine additional official Workday career portals are configured for their first production import: Applied Materials, Mastercard, Wells Fargo, Thomson Reuters, Fidelity Investments, Autodesk, Target, Bank of America and Walmart Global Tech. Research-environment access results are kept separate from deployed-backend verification. These portals remain pending or need attention until a successful import validates them; they are not added to the checked-brand numerator merely by configuration.

## Checkpoints and matching

Large sources save public requisition IDs and page offsets after validated batches. The owner refresh can advance up to eight sources per call, with two concurrent reads and a time budget. A large pending source does not prevent the other sources in the batch from advancing. Old prefix cursors are migrated without forcing a new sweep.

Workday CXS can report `total: 0` on subsequent pages while continuing to return jobs; the importer carries the verified first-page total. Microsoft details use smaller batches and retain their existing cursor. Transient failures after successful pages respect Retry-After and resume saved work, with at most two requeues per source per sweep. Persistent throttling is reported as failed/deferred so other imports and alerts can finish. Microsoft's unfinished public-search checkpoint can carry across scheduled passes for up to seven days. A parser revision revalidates only its affected source, preserving the rest of the sweep.

The shared catalogue is collected independently of students' preferences. India scope, experience, graduation, location and arrangement checks remain explicit. Unknown requirements stay in Needs review. The Companies view includes configured employers even when the chosen student scope has zero matches.

Non-2xx responses and invalid or incomplete snapshots retain existing jobs. Rate limits honor a cooldown. Search-window providers cannot close jobs merely because a later search omitted them. Only a consistent complete snapshot or explicit individual verification can mark an opening closed. Student decisions, notes and application history are never rewritten by the importer.

## Remaining coverage gaps

The other **214 requested brands have no configured feed in this release**. Configuration alone is not a successful connection; the app reports the exact checked count separately. Many directory entries still need an official endpoint; some employer platforms require a dedicated connector or authorized access. Public pages and tokens migrate: PhonePe and Postman's old Greenhouse routes no longer provide working feeds; Visa and Palo Alto Networks have moved to Workday; a reachable old board is not sufficient evidence of a current integration.

Public employer-hosted portals that return restrictions in the deployed importer are marked as needing attention. Source validation never bypasses a challenge or supplies a student's API key. Additional boards must pass actual public index/detail checks before being counted as checked.

## Primary source references

- [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html)
- [Lever public Postings API](https://github.com/lever/postings-api)
- [SmartRecruiters public postings](https://developers.smartrecruiters.com/reference/v1listpostings)
- [Trakstar / Recruiterbox public frontend API](https://apiv1.recruiterbox.com/frontend_api.html)
- [Google India career results](https://www.google.com/about/careers/applications/jobs/results/?location=India)
- [Amazon India careers](https://www.amazon.jobs/en/locations/india)
- [Microsoft India career search](https://apply.careers.microsoft.com/careers?location=India)
- [Salesforce public Workday portal](https://salesforce.wd12.myworkdayjobs.com/External_Career_Site)
- [Oracle public career portal](https://eeho.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jobsearch)
- [JPMorgan Chase public career portal](https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001)
- [MoEngage](https://careers.kula.ai/moengage), [CleverTap](https://careers.kula.ai/clevertap), [Cashfree Payments](https://careers.kula.ai/cashfree)

Regression fixtures use captured public posting fields. They contain no student profiles, application records, credentials or manufactured product metrics.
