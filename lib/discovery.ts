import type {Profile} from './types';

// These are user-clicked website searches, not imported results or API calls.
// Only role, location and broad job filters enter the URLs; no identity or grades.
export function externalDiscovery(profile:Profile,role:string,place:string){
 const keywords=role.trim().slice(0,250),location=place.trim().slice(0,150);
 const linkedin=new URL('https://www.linkedin.com/jobs/search/');
 linkedin.searchParams.set('keywords',keywords);
 if(location&&!/^anywhere$/i.test(location))linkedin.searchParams.set('location',location);
 if(profile.experience===0)linkedin.searchParams.set('f_E','1,2');
 const modes=profile.modes.map(m=>({'On-site':'1',Remote:'2',Hybrid:'3'} as Record<string,string>)[m]).filter(Boolean);
 if(modes.length&&modes.length<3)linkedin.searchParams.set('f_WT',modes.join(','));
 const types=profile.jobTypes.map(t=>({'Full-time':'F',Internship:'I',Contract:'C'} as Record<string,string>)[t]).filter(Boolean);
 if(types.length)linkedin.searchParams.set('f_JT',types.join(','));
 const companySearch=new URL('https://www.google.com/search');
 companySearch.searchParams.set('q',[keywords,location,'(careers OR "join our team")',profile.experience===0?'(intern OR graduate OR fresher OR "entry level")':''].filter(Boolean).join(' '));
 return{linkedin:linkedin.toString(),unstopJobs:'https://unstop.com/job',unstopInternships:'https://unstop.com/internships',companySearch:companySearch.toString()};
}
