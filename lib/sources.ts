import type { Source } from './types';
export const SOURCES: Source[] = [
  {
    "id": "razorpaysoftwareprivatelimited",
    "company": "Razorpay",
    "provider": "greenhouse",
    "token": "razorpaysoftwareprivatelimited",
    "careerUrl": "https://razorpay.com/careers/"
  },
  {
    "id": "cloudsek",
    "company": "CloudSEK",
    "provider": "greenhouse",
    "token": "cloudsek",
    "careerUrl": "https://www.cloudsek.com/openings"
  },
  {
    "id": "formaaiinc3",
    "company": "Forma.ai",
    "provider": "greenhouse",
    "token": "formaaiinc3",
    "careerUrl": "https://www.forma.ai/careers"
  },
  {
    "id": "instawork",
    "company": "Instawork",
    "provider": "greenhouse",
    "token": "instawork",
    "careerUrl": "https://www.instawork.com/careers"
  },
  {
    "id": "karya",
    "company": "Karya",
    "provider": "greenhouse",
    "token": "karya",
    "careerUrl": "https://www.karya.in/join-us/careers/"
  },
  {
    "id": "singlestore",
    "company": "SingleStore",
    "provider": "greenhouse",
    "token": "singlestore",
    "careerUrl": "https://www.singlestore.com/careers/"
  },
  {
    "id": "zinnov",
    "company": "Zinnov",
    "provider": "greenhouse",
    "token": "zinnov",
    "careerUrl": "https://zinnov.com/careers/"
  },
  {
    "id": "skildai-careers",
    "company": "Skild AI",
    "provider": "greenhouse",
    "token": "skildai-careers",
    "careerUrl": "https://www.skild.ai/career"
  },
  {
    "id": "formaaiinc",
    "company": "Forma.ai",
    "provider": "greenhouse",
    "token": "formaaiinc",
    "careerUrl": "https://www.forma.ai/careers"
  },
  {"id": "sarvam", "company": "Sarvam", "provider": "ashby", "token": "sarvam", "careerUrl": "https://jobs.ashbyhq.com/sarvam"},
  {"id": "sprinto", "company": "Sprinto", "provider": "lever", "token": "Sprinto", "careerUrl": "https://jobs.lever.co/Sprinto"},
  {"id": "drivetrain", "company": "Drivetrain", "provider": "lever", "token": "drivetrain", "careerUrl": "https://jobs.lever.co/drivetrain"},
  {"id": "paytm", "company": "Paytm", "provider": "lever", "token": "paytm", "careerUrl": "https://jobs.lever.co/paytm"},
  {"id": "meesho", "company": "Meesho", "provider": "lever", "token": "meesho", "careerUrl": "https://jobs.lever.co/meesho"},
  {"id": "dozee", "company": "Dozee", "provider": "lever", "token": "dozee", "careerUrl": "https://jobs.lever.co/dozee"},
  {"id": "hevodata", "company": "Hevo Data", "provider": "lever", "token": "hevodata", "careerUrl": "https://jobs.lever.co/hevodata"},
  {"id": "cred", "company": "CRED", "provider": "lever", "token": "cred", "careerUrl": "https://jobs.lever.co/cred"},
  {"id": "notion", "company": "Notion", "provider": "ashby", "token": "notion", "careerUrl": "https://jobs.ashbyhq.com/notion"},
  {"id": "supabase", "company": "Supabase", "provider": "ashby", "token": "supabase", "careerUrl": "https://jobs.ashbyhq.com/supabase"},
  {"id": "zapier", "company": "Zapier", "provider": "ashby", "token": "zapier", "careerUrl": "https://jobs.ashbyhq.com/zapier"},
  {id:'jobicy-worldwide',company:'Jobicy',provider:'jobicy',token:'anywhere',careerUrl:'https://jobicy.com/jobs',category:'job-board',scope:'Worldwide remote listings published in the last 7 days, with a 3-hour provider delay. Older imported jobs are checked separately. New discovery passes run at most hourly.'}
  ,{id:'zeta',company:'Zeta',provider:'lever',token:'zeta',careerUrl:'https://www.zeta.tech/us/careers/'}
];
export const SOURCE_REGISTRY = SOURCES.map(s=>s.id+':'+s.provider+':'+s.token).join('|');
