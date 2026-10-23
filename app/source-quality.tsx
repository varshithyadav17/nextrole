"use client";
import type {CatalogueSummary} from '../lib/catalogue-types';
export default function SourceQuality({quality}:{quality:CatalogueSummary['quality']|null|undefined}){
 const q=quality;
 if(!q)return <section className="source-quality settings-card" aria-labelledby="coverage-quality"><h2 id="coverage-quality">What your coverage actually contains</h2><p role="status">Preparing catalogue counts…</p></section>;
 return <section className="source-quality settings-card" aria-labelledby="coverage-quality"><h2 id="coverage-quality">What your coverage actually contains</h2><div className="quality-grid">{[[q.visibleOpenings,'Distinct active openings'],[q.employers,'Employers represented'],[q.forYou,'Unhandled matches for you'],[q.needsReview,'Unhandled matches to review'],[q.staleOrUnverified,'Stale or unverified'],[q.incomplete,'Shortened source descriptions']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><p>These counts describe the complete catalogue snapshot and your saved preferences. An active feed record is not proof that every candidate is eligible. Broken-link rates and extraction accuracy require separate checks and are not inferred from these counts.</p></section>;
}
