import {matchesRole} from './matching';
import type {JobView,Match} from './types';
export type SearchFilters={company?:string;role?:string;mode?:string;view?:string};
export function matchesView(match:Match,view='for-you'){
 return view==='all'||match.relevant&&(view==='review'?match.uncertain:!match.uncertain);
}
/** One policy for client browsing, keyword search and AI candidate selection. */
export function candidateJobs(jobs:JobView[],filters:SearchFilters={}){
 return jobs.filter(j=>j.active&&!j.status&&(!j.deadline||Date.parse(j.deadline)>Date.now())&&
  (!filters.company||filters.company==='all'||j.company===filters.company)&&
  (!filters.role||filters.role==='all'||matchesRole(j.title,filters.role))&&
  (!filters.mode||filters.mode==='All arrangements'||j.mode===filters.mode)&&matchesView(j.match,filters.view));
}
