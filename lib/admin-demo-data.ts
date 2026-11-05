import type {FeedbackRow} from './community-types';
import type {Profile} from './types';

/** Invented, reproducible fixtures. Never import these records into a live database. */
export const DEMO_DATASET_ID='nextrole-synthetic-1040-v2';
export const DEMO_LABEL='SYNTHETIC DEMO — fictional profiles, activity and reviews';
export type DemoProfile={userId:string;name:string;email:string;city:string;role:string;analyticsEnabled:boolean;firstDay:string;createdAt:string;data:Profile;dataMode:'synthetic'};
export type DemoEvent={id:string;userId:string;kind:string;day:string;createdAt:string;dataMode:'synthetic'};
export type DemoActivity={userId:string;day:string;section:string;seconds:number;dataMode:'synthetic'};
export type DemoApplication={userId:string;jobKey:string;jobId:string;stage:string;checked:boolean;createdAt:string;updatedAt:string;dataMode:'synthetic'};
export type DemoFeedback=FeedbackRow&{userId:string;name:string;email:string;role:string;dataMode:'synthetic'};
export type DemoDataset={datasetId:string;dataMode:'synthetic';today:string;profiles:DemoProfile[];events:DemoEvent[];activity:DemoActivity[];applications:DemoApplication[];feedback:DemoFeedback[]};
export const shiftDemoDay=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export const demoDay=(now=new Date())=>new Date(now.getTime()+330*60000).toISOString().slice(0,10);
const at=(day:string,minute=0)=>new Date(Date.parse(day+'T04:30:00Z')+minute*60000).toISOString();
const firstNames=['Aarav','Aditi','Ishaan','Ananya','Vivaan','Ishita','Arjun','Kavya','Rohan','Meera','Aditya','Naina','Aryan','Riya','Dhruv','Sanya','Harsh','Shreya','Kabir','Tanvi','Kunal','Avni','Manav','Pooja','Nikhil','Sakshi','Pranav','Simran','Rahul','Sneha','Rishabh','Srishti','Sahil','Vaishnavi','Shivam','Vidhi','Vedant','Yashvi','Yash','Aastha'];
const lastNames=['Sharma','Verma','Gupta','Singh','Agarwal','Jain','Yadav','Mishra','Chauhan','Saxena','Bhatia','Kapoor','Joshi','Sinha','Malhotra','Tiwari','Srivastava','Khanna','Arora','Bansal','Goel','Sethi','Mehra','Dubey','Bhardwaj','Pandey'];
const cities=['Jaipur','Delhi','Lucknow','Chandigarh','Noida','Indore','Dehradun','Bhopal'];
const roles=['Software engineer','Data analyst','Product manager','Business analyst','Frontend developer','Backend developer'];
const skills=[['Python','SQL','Git'],['SQL','Excel','Python'],['User research','SQL','Prioritization'],['Excel','SQL','Communication'],['React','TypeScript','CSS'],['Python','REST APIs','PostgreSQL']];
const strengths=[['Job relevance','Saved preferences keep the search focused on entry-level roles.'],['Applications','The application timeline keeps my next step easy to find.'],['Usability','Saving jobs in one place is straightforward on my phone.'],['Usability','Scout makes reviewing my resume against a job description easier.'],['Reminders','The saved-job deadline reminder is useful while preparing for exams.'],['Applications','Marking Applied keeps the same vacancy out of my new-job list.'],['Usability','Downloading PDF and LaTeX drafts makes revisions convenient.'],['Job relevance','Seeing the eligibility evidence helps me review the opening.'],['Usability','The company view makes comparing roles easier.'],['Applications','Adding an external job link helps me keep my tracker together.']] as const;
const painPoints=[['Job relevance','I still need clearer graduation-batch evidence when the employer does not mention it.'],['Missing jobs','I could not find a few campus openings that were shared in our placement group.'],['Usability','The chat composer takes too much space on my smaller phone.'],['AI connections','Connecting an AI provider is confusing the first time.'],['Reminders','I would like a clearer reminder setting for jobs with no listed deadline.'],['Applications','I need a faster way to update several application stages.'],['Bug','The resume preview sometimes needs a second attempt before it opens.'],['Missing jobs','I want broader company coverage for business analyst internships.'],['Usability','Switching between a job and my saved list could feel smoother.'],['Feature idea','A weekly preparation checklist would help me plan around classes.'],['Job relevance','Please make remote-region restrictions easier to spot.'],['Usability','Some job descriptions are difficult to scan on a narrow screen.']] as const;
const contexts=['between lectures','during placement preparation','before an application deadline','while reviewing internships','alongside semester work','when comparing companies','during my evening search','while preparing for assessments'];
const positiveEnds=['I can return to the same shortlist later.','The important details are easier to review.','The steps feel easier to follow.','It is useful to have the preparation tools beside the job.','The layout is easy to scan.','I would keep using the saved-job view.'];
function random(seed:number){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
let cached:DemoDataset|undefined;
export function demoDataset(today=demoDay()):DemoDataset{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||new Date(today+'T00:00:00Z').toISOString().slice(0,10)!==today)throw new Error('Choose a valid demo date.');
 if(cached?.today===today)return cached;
 const profiles:DemoProfile[]=[],events:DemoEvent[]=[],activity:DemoActivity[]=[],applications:DemoApplication[]=[],feedback:DemoFeedback[]=[];
 // Deliberate 4.3/5 test scenario, never an earned product rating.
 const ratings=[...Array<number>(12).fill(1),...Array<number>(28).fill(2),...Array<number>(92).fill(3),...Array<number>(412).fill(4),...Array<number>(496).fill(5)];
 const shuffle=random(1040);for(let i=ratings.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[ratings[i],ratings[j]]=[ratings[j],ratings[i]];}
 for(let i=0;i<1040;i++){
  const rng=random(i+8171),serial=String(i+1).padStart(4,'0'),userId='synthetic:student:'+serial;
  const name=firstNames[i%40]+' '+lastNames[Math.floor(i/40)%26],email=name.toLowerCase().replace(' ','.')+'.'+serial+'@example.invalid';
  const city=cities[i%cities.length],role=roles[i%roles.length],age=(i*37)%90,firstDay=shiftDemoDay(today,-age),createdAt=at(firstDay),analyticsEnabled=i%19!==0,completed=rng()>.09;
  const profile:DemoProfile={userId,name,email,city,role,analyticsEnabled,firstDay,createdAt,dataMode:'synthetic',data:{name,roles:[role],locations:[city,'India'],modes:i%3===0?['Remote']:['Hybrid','On-site'],skills:skills[i%skills.length],experience:0,graduationYear:i%5===0?'2026':'2027',degree:i%2?'B.Tech. Computer Science':'B.Tech. Electronics and Communication',jobTypes:['Full-time','Internship'],alerts:false,reminders:false,completed}};
  profiles.push(profile);
  const event=(kind:string,day:string,minute:number)=>events.push({id:'synthetic:event:'+serial+':'+day+':'+kind,userId,kind,day,createdAt:at(day,minute),dataMode:'synthetic'});
  if(analyticsEnabled)for(let offset=0;offset<=age;offset++){
   const oneDay=i%10<2,earlyDrop=i%10<4;
   if(offset>0&&(oneDay||(earlyDrop&&offset>4)||rng()>(i%10<7?.22:.47)))continue;
   const day=shiftDemoDay(firstDay,offset),base=Math.floor(rng()*480);event('workspace_open',day,base);
   if(offset===0&&completed)event('profile_completed',day,base+1);
   if(rng()<.88){event('job_view',day,base+2);if(rng()<.4)event('saved',day,base+3);
    if(rng()<.38){event('apply_open',day,base+5);if(rng()<.61){event('applied',day,base+9);const jobKey='synthetic:job:'+serial+':'+day,stageRoll=rng(),stage=stageRoll<.50?'Applied':stageRoll<.68?'Assessment':stageRoll<.83?'Interviewing':stageRoll<.87?'Offer':'Rejected';applications.push({userId,jobKey,jobId:jobKey,stage,checked:rng()<.78,createdAt:at(day,base+9),updatedAt:at(day,base+12),dataMode:'synthetic'});if(stage!=='Applied')event('stage_updated',day,base+12);}}
   }
   if(rng()<.55)event('filter_role',day,base+1);if(rng()<.31)event('filter_company',day,base+1);
   if(rng()<.36){event('scout_message',day,base+4);if(rng()<.68)event('scout_score',day,base+5);if(rng()<.42)event('scout_build',day,base+6);}
   if(offset===0&&rng()<.65)event('resume_upload',day,base+4);
   const total=100+Math.floor(rng()*620),discover=Math.floor(total*.42),job=Math.floor(total*.28),applicationsTime=Math.floor(total*.18);
   for(const [section,seconds] of [['discover',discover],['job',job],['applications',applicationsTime],['settings',total-discover-job-applicationsTime]] as const)activity.push({userId,day,section,seconds,dataMode:'synthetic'});
  }
  const rating=ratings[i],strength=strengths[i%strengths.length],pain=painPoints[Math.floor(i/strengths.length)%painPoints.length],context=contexts[Math.floor(i/120)%contexts.length];
  const category=rating===5?strength[0]:pain[0],reviewDay=shiftDemoDay(today,-Math.min(age,(i*11)%30)),reviewAt=at(reviewDay,30+i%400);
  const message=rating===5?`${strength[1]} I used it ${context}. ${positiveEnds[Math.floor(i/10)%positiveEnds.length]}`:rating===4?`${strength[1]} ${pain[1]} I noticed this ${context}.`:rating===3?`Useful ${context}, but the experience is uneven. ${pain[1]} ${strength[1]}`:`I ran into a problem ${context}. ${pain[1]} ${rating===1?'I could not finish the task comfortably.':'It works in parts, but I need this improved.'}`;
  const status=rating<3?(i%2?'new':'planned'):rating===3?(i%2?'reviewing':'planned'):(i%7===0?'reviewing':'resolved');
  feedback.push({id:'synthetic:review:'+serial,userId,name,email,role,dataMode:'synthetic',kind:'apply',job_id:null,rating,category,subject:rating===5?'Helpful for my '+role.toLowerCase()+' search':rating===4?'Useful, with room to improve':rating===3?'A mixed experience':'A problem to fix',message,needs:rating<5?pain[1]:'',difficulty:rating<=2?pain[1]:'',period:null,status,priority:rating<=2?'high':'normal',reply:'',replied_at:null,reply_read_at:null,resolved_at:status==='resolved'?at(reviewDay,500+i%120):null,created_at:reviewAt,updated_at:status==='resolved'?at(reviewDay,500+i%120):reviewAt});
  if(i%13===0){const supportDay=shiftDemoDay(today,-Math.min(age,i%27)),supportAt=at(supportDay,10),replied=i%3!==0,resolved=i%4===0;feedback.push({id:'synthetic:help:'+serial,userId,name,email,role,dataMode:'synthetic',kind:'help',job_id:null,rating:null,category:pain[0],subject:'Question about '+pain[0].toLowerCase(),message:pain[1],needs:pain[1],difficulty:'',period:null,status:resolved?'resolved':replied?'reviewing':'new',priority:i%3?'normal':'high',reply:replied?'Sample reply: thanks for the details. This issue is being reviewed.':'',replied_at:replied?at(supportDay,90+i%180):null,reply_read_at:null,resolved_at:resolved?at(supportDay,400+i%100):null,created_at:supportAt,updated_at:at(supportDay,500)});}
 }
 return cached={datasetId:DEMO_DATASET_ID,dataMode:'synthetic',today,profiles,events,activity,applications,feedback};
}
