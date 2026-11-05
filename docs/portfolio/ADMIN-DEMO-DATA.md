# Reproducible admin demo

The `/demo/admin` page and the host's **Demo workspace** use an isolated, fictional dataset. This demonstrates the analytics product; it does not substantiate real adoption, retention, customer ratings or testimonials. Live mode remains backed by actual operational records.

## Included

- 1,040 unique fictional student profiles with common Indian names and non-deliverable `example.invalid` addresses.
- One invented rated review per profile, including positive, moderate and critical feedback; 80 additional sample help requests.
- A deliberately selected 4.3/5 rating scenario: 12 one-star, 28 two-star, 92 three-star, 412 four-star and 496 five-star reviews. Changing the period recalculates the rating from records in that period.
- Deterministic events, active-time samples and application records over 90 days; simulated analytics opt-outs generate no telemetry.
- Search, rating/category filters, sorting, pagination, profile drill-down, CSV/JSON exports and the existing aggregate PDF download. Every view and export retains its synthetic provenance.

## Recreate the database

Use Node 22.13+ with type stripping (Node 24 recommended) and installed project dependencies:

```sh
npm run demo:seed -- --out /absolute/empty/local-directory
npm run test:admin-demo
```

The seeder only creates a new `NextRole-SYNTHETIC-DEMO.sqlite` in an empty directory. It accepts no connection string, production D1 binding or credentials. It runs the current `drizzle/*.sql` migrations, then inserts the generated rows and adds `demo_metadata` and `demo_identities`. Existing databases are never opened or overwritten.

The database, companion JSON and dashboard all originate in `lib/admin-demo-data.ts`. Calculations are in `lib/admin-demo.ts`. The verifier independently queries SQLite and reconciles activity, time, features, ratings, retention and application counts for 7/30/90-day windows. It also checks opt-outs, maturity, denominators, outbound blocking and private host API authorization.

No Google/authentication accounts, API keys, email subscribers, push subscriptions or application automation tasks are created. Insert triggers prevent this local demo database from acquiring credentials or outbound delivery records. Generated files belong under ignored `outputs/` and must never be imported into production.

## Metric lineage

| Metric | Numerator / calculation | Denominator / scope | Source |
| --- | --- | --- | --- |
| Stored profiles | Profile count | All fictional profiles | `profiles` |
| DAU / WAU / MAU | Distinct workspace visitors | 1 / 7 / 30 days | `product_events` |
| Feature adoption | Distinct feature participants | Active participants in period | `product_events` |
| Day-7 return | Participants active exactly 7 days after first observation | First-observed participants with 7 full days of follow-up | `product_people` + `product_events` |
| Weekly cohorts | Participants with activity in each rolling seven-day window | First-observed cohort; immature cells hidden | `product_people` + `product_events` |
| Active time estimate | Sum of section/day samples | Analytics-enabled participants in period | `product_activity_days` |
| Mean rating | Sum of star values | Rated feedback in selected period | `feedback` |
| Application journey | Distinct users completing workspace → job → Apply → Applied in order | Selected-period participants | `product_events` |
| Application stages | Current stage counts | Application records updated in period | `user_jobs` |

## Evidence for a resume or interview

This demo supports a statement such as **“Built an admin analytics dashboard with retention cohorts, feature adoption, application progression and a reproducible 1,040-profile synthetic test dataset.”**

The resume's separate **920+ real users** and **4.3/5 real in-app rating** claims require real, dated exports. Keep the rating response count, rating sum/distribution, measurement window and exclusion rules with the source records. Independently reconcile those actual records in Live analytics. Generated reviews and the deliberate 4.3 scenario cannot validate those claims or be presented as real customer feedback.
