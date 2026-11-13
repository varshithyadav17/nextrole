// Read-only source verification. No database, application submission or student credentials.
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if((specifier.startsWith('.')||specifier.startsWith('/'))&&!/\.(?:mjs|js|json|ts)$/.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {fetchSourceJobs,sourceFeedUrl}=await import('../lib/job-feeds.ts');
const groups={
 greenhouse:[['Groww','groww'],['InMobi','inmobi'],['DevRev','devrev'],['Sumo Logic','sumologic'],['GitLab','gitlab'],['Twilio','twilio'],['Enterpret','enterpret'],['FourKites','fourkites'],['Sigmoid','sigmoid'],['Emergent Labs','emergentlabsinc'],['PhonePe','phonepe'],['Postman','postman'],['Rubrik','rubrik'],['Fivetran','fivetran'],['Netradyne','netradyne'],['MongoDB','mongodb'],['Druva','druva'],['Stripe','stripe'],['Okta','okta'],['Netskope','netskope'],['Databricks','databricks'],['Elastic','elastic'],['Cloudflare','cloudflare'],['Suki','suki'],['Chargebee','chargebee'],['CleverTap','clevertap'],['Harness','harness'],['Tekion','tekion'],['Rippling','rippling'],['Nutanix','nutanix'],['Confluent','confluent'],['Airbnb','airbnb'],['Zscaler','zscaler'],['HackerRank','hackerrank'],['HackerEarth','hackerearth'],['Sprinklr','sprinklr']],
 lever:[['Fam','fampay'],['Mindtickle','mindtickle'],['Whatfix','whatfix'],['Leap','leap'],['Merkle Science','merklescience']],
 ashby:[['Atlan','atlan'],['Composio','composio'],['Ema','ema'],['Rupeek','rupeek'],['TrueFoundry','truefoundry'],['Portkey AI','portkey'],['UnifyApps','unifyapps']]
};
const boards={greenhouse:t=>'https://job-boards.greenhouse.io/'+t,lever:t=>'https://jobs.lever.co/'+t,ashby:t=>'https://jobs.ashbyhq.com/'+t};
const additional={greenhouse:[['Coinbase','coinbase'],['Innovaccer','innovaccer'],['Gupshup','gupshup'],['Amagi','amagi']],lever:[['CleverTap','clevertap'],['Uniphore','uniphore'],['Icertis','icertis']],ashby:[['Appsmith','appsmith'],['ToolJet','tooljet'],['SpotDraft','spotdraft']]};
const selected=process.argv.includes('--additional')?additional:groups;
const candidates=Object.entries(selected).flatMap(([provider,list])=>list.map(([company,token])=>({id:token,company,provider,token,careerUrl:boards[provider](token)})));
const target=process.env.NEXTROLE_VALIDATION_OUTPUT||'/tmp/nextrole-expansion-validation.json';
const results=process.argv.includes('--additional')?JSON.parse(await fs.readFile(target,'utf8')):[];
for(let i=0;i<candidates.length;i+=4){
 const part=await Promise.all(candidates.slice(i,i+4).map(async source=>{
  const checkedAt=new Date().toISOString();
  try{
   const jobs=await fetchSourceJobs(source,checkedAt);
   const india=jobs.filter(j=>/\b(?:india|bengaluru|bangalore|hyderabad|chennai|pune|mumbai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|kochi|coimbatore)\b/i.test(j.location)||j.countryCodes?.includes('IN'));
   return {source,feedUrl:sourceFeedUrl(source),checkedAt,ok:true,jobs:jobs.length,india:india.length,indiaInternships:india.filter(j=>j.jobType==='Internship').length,indiaEntryLevel:india.filter(j=>j.minExperience===0).length,descriptionMissing:jobs.filter(j=>!j.description.trim()).length,eligibleForRegistration:india.length>0&&jobs.length>0};
  }catch(error){return{source,feedUrl:sourceFeedUrl(source),checkedAt,ok:false,error:error.message,eligibleForRegistration:false};}
 }));
 results.push(...part);for(const row of part)console.log(JSON.stringify(row));
}
await fs.writeFile(target,JSON.stringify(results,null,2));
console.log(JSON.stringify({checked:results.length,ready:results.filter(r=>r.eligibleForRegistration).length,output:target}));
