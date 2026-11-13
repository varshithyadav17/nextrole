// Reminders are processed by the existing source-check schedule in Asia/Kolkata.
import {SHARED_REFRESH_HOURS} from './refresh-schedule';
export function nextReminderCheck(iso:string):string {
 const requested=new Date(iso).getTime();
 const local=new Date(requested+330*60000);
 const day=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());
 for(const hour of SHARED_REFRESH_HOURS){
  const candidate=day+hour*3600000-330*60000;
  if(candidate>=requested)return new Date(candidate).toISOString();
 }
 return new Date(day+86400000+SHARED_REFRESH_HOURS[0]*3600000-330*60000).toISOString();
}
