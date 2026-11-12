/** Friendly backup names. Original bytes and checksummed import metadata stay intact. */
export function analyticsBackupFileName(source:{activityRows?:number;sheets?:{name:string}[]}){
 const activity=!!source.activityRows||source.sheets?.some(sheet=>sheet.name.toLowerCase()==='activity');
 return activity?'NextRole_Activity_Backup.xlsx':'NextRole_User_Directory.xlsx';
}
