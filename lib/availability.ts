import type {Job} from './types';
/** A retained job is not confirmed closed merely because availability is unknown. */
export function availabilityUnconfirmed(job:Job,now=Date.now()){
 return job.active&&(job.availability==='unknown'||job.sourceCategory==='job-board'&&(!job.availabilityCheckedAt||!Number.isFinite(Date.parse(job.availabilityCheckedAt))||now-Date.parse(job.availabilityCheckedAt)>24*3600000));
}
