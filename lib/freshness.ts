import type {Job} from './types';
export const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;
export function verificationState(job: Pick<Job, 'active' | 'deadline' | 'lastChecked'> & Partial<Pick<Job,'availability'>>, now = Date.now()) {
  if (!job.active || job.deadline && Date.parse(job.deadline) <= now) return 'closed';
  if(job.availability==='unknown')return 'unknown';
  const checked = Date.parse(job.lastChecked);
  if (!Number.isFinite(checked) || checked > now + 5 * 60000) return 'unknown';
  return now - checked <= FRESHNESS_WINDOW_MS ? 'fresh' : 'stale';
}
