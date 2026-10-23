// Reminders are processed by the existing source-check schedule in Asia/Kolkata.
export function nextReminderCheck(iso:string):string {
 const requested=new Date(iso).getTime();
 const local=new Date(requested+330*60000);
 const day=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate());
 for(const hour of [9,14,19]){
  const candidate=day+hour*3600000-330*60000;
  if(candidate>=requested)return new Date(candidate).toISOString();
 }
 return new Date(day+86400000+9*3600000-330*60000).toISOString();
}
