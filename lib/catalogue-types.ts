import type {JobView} from './types';

export type CatalogueFilters={
 tab:'discover'|'interested'|'applications'|'archive';
 query:string;view:'for-you'|'review'|'all';company:string;role:string;mode:string;
 sort:'Best match'|'Newest first'|'Deadline soon';ids?:string[];
};
export type ScopeCounts={total:number;roles:Record<string,number>};
export type CompanyCounts={company:string;scopes:Record<'for-you'|'review'|'all',ScopeCounts>};
export type CatalogueSummary={
 counts:{discover:number;interested:number;applications:number;archive:number};
 quality:{visibleOpenings:number;employers:number;fresh:number;staleOrUnverified:number;incomplete:number;forYou:number;needsReview:number};
 companies:CompanyCounts[];scanned:number;
};
export type CataloguePage={jobs:JobView[];total:number;nextCursor:string|null;snapshotId:string;expiresAt:string;summary:CatalogueSummary;cached:boolean};
