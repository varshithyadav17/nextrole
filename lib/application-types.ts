import type {JobView} from './types';
import type {ApplicationKit} from './preparation';
export const MILESTONES=['response','oa','interview'] as const;
export type Milestone=typeof MILESTONES[number];
export type ApplicationRecord={revision:string;jobId:string;jobKey:string;company:string;title:string;role:string;appliedAt:string|null;fitAtConfirmation?:{relevant:boolean;uncertain:boolean;checkedAt:string};listingSnapshot:Pick<JobView,'title'|'company'|'url'|'description'|'lastChecked'>&{capturedAt:string};milestones:Record<Milestone,{doneAt:string|null;dueAt:string|null}>;submitted:{kit:Pick<ApplicationKit,'id'|'revision'|'resume'|'questions'|'createdAt'|'profileRevision'>;pdf:string;sha256:string}|null;updatedAt:string};
