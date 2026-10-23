import {rows} from './store';
import {loadSources} from './source-registry';
/** Catalogue coverage, not a personal relevance score or a provider billing estimate. */
export async function discoveryMetrics(){
 const SOURCES=await loadSources();
 const counts=await rows<{category:string;open:number;unknown:number}>("SELECT CASE WHEN source_id='google-jobs-serpapi' THEN 'search-index' WHEN source_id='jobicy-worldwide' THEN 'job-board' ELSE 'employer' END as category,COUNT(DISTINCT CASE WHEN COALESCE(json_extract(data,'$.availability'),'open')='open' THEN job_key END) as open,COUNT(DISTINCT CASE WHEN json_extract(data,'$.availability')='unknown' THEN job_key END) as unknown FROM jobs WHERE active=1 GROUP BY category");
 return {categories:['employer','job-board','search-index'].map(category=>({category,sources:category==='search-index'?(counts.find(c=>c.category===category)?1:0):SOURCES.filter(s=>(s.category||'employer')===category).length,open:counts.find(c=>c.category===category)?.open||0,unknown:counts.find(c=>c.category===category)?.unknown||0})),note:'Unique stored vacancies per source category at the last checks. Unknown availability is excluded from open counts. These are catalogue counts, not eligible matches, market coverage or API costs.'};
}
