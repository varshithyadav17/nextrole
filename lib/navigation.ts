export type Tab = 'today' | 'discover' | 'interested' | 'applications' | 'archive' | 'sources' | 'settings' | 'companies' | 'analytics' | 'host';
export type RadarLocation = {tab:Tab;query:string;view:string;mode:string;sort:string;selected:string|null;visibleCount:number;updates:boolean;company:string;role:string;settingsView:'profile'|'career'|'ai'|'alerts'|'help'|'automation'};
export const defaultLocation:RadarLocation = {tab:'discover',query:'',view:'for-you',mode:'All arrangements',sort:'Best match',selected:null,visibleCount:20,updates:false,company:'all',role:'all',settingsView:'profile'};
const tabs = ['today','discover','interested','applications','archive','sources','settings','companies','analytics','host'];
export function readRadarLocation(search:string,pathname='/'):RadarLocation {
 const p = new URLSearchParams(search);
 let pageJob:string|null=null;const match=pathname.match(/^\/jobs\/([^/]+)\/?$/);
 if(match)try{pageJob=decodeURIComponent(match[1]).slice(0,200)||null;}catch{}
 return {
  tab:tabs.includes(p.get('tab')||'')?p.get('tab') as Tab:'discover',
  query:(p.get('q')||'').slice(0,500),
  view:['all','review'].includes(p.get('view')||'')?p.get('view')!:'for-you',
  mode:['Remote','Hybrid','On-site','Not specified'].includes(p.get('mode')||'')?p.get('mode')!:'All arrangements',
  sort:['Newest first','Deadline soon'].includes(p.get('sort')||'')?p.get('sort')!:'Best match',
  selected:pageJob||(p.get('job')||'').slice(0,200)||null,
  updates:p.get('updates')==='1',
  company:(p.get('company')||'all').slice(0,100),role:(p.get('role')||'all').slice(0,100),settingsView:p.get('settings')==='automation'?'automation':p.get('settings')==='career'?'career':p.get('settings')==='help'?'help':p.get('settings')==='ai'?'ai':p.get('settings')==='alerts'?'alerts':'profile',
  visibleCount:Math.min(10000,Math.max(20,Math.floor(Number(p.get('limit'))/20)*20||20))
 };
}
export function radarHref(state:RadarLocation):string {
 const p = new URLSearchParams();
 if(state.tab!=='discover')p.set('tab',state.tab);
 if(state.query)p.set('q',state.query);
 if(state.view!=='for-you')p.set('view',state.view);
 if(state.mode!=='All arrangements')p.set('mode',state.mode);
 if(state.sort!=='Best match')p.set('sort',state.sort);
 if(state.updates)p.set('updates','1');
 if(state.company!=='all')p.set('company',state.company);
 if(state.role!=='all')p.set('role',state.role);
 if(state.settingsView!=='profile')p.set('settings',state.settingsView);
 if(state.visibleCount>20)p.set('limit',String(state.visibleCount));
 return (state.selected?'/jobs/'+encodeURIComponent(state.selected):'/')+(p.size?'?'+p.toString():'');
}
