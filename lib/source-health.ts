import {candidateJobs} from './job-selection';
import {verificationState} from './freshness';
import type {JobView} from './types';
export function catalogueQuality(jobs:JobView[]){
 const active=jobs.filter(j=>verificationState(j)!=='closed'),unique=[...new Map(active.map(j=>[j.key,j])).values()];
 return {visibleOpenings:unique.length,employers:new Set(unique.map(j=>j.company)).size,
  fresh:unique.filter(j=>verificationState(j)==='fresh').length,
  staleOrUnverified:unique.filter(j=>verificationState(j)!=='fresh').length,
  incomplete:unique.filter(j=>j.evidenceComplete===false).length,
  forYou:candidateJobs(unique).length,needsReview:candidateJobs(unique,{view:'review'}).length};
}
