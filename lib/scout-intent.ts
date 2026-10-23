/** Only explicit tool requests run tools. Questions and negated requests stay conversation. */
export function scoutIntent(message:string):'build'|'score'|'one-page'|null {
 const text=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 if(/\b(?:don't|do not|never|stop)\b/.test(text)||/^(?:what|why|explain|meaning)\b/.test(text))return null;
 if(/^\/one-page\s*$/.test(text)||/\b(?:make|fit|convert|shorten|reduce)\b.{0,70}\b(?:one|1|single)[ -]?page\b/.test(text))return 'one-page';
 if(/^\/(?:score|fit)\s*$/.test(text))return 'score';
 if(/^\/(?:build|resume)\s*$/.test(text))return 'build';
 if(/\b(?:build|create|generate|make)\b.{0,45}\b(?:resume|cv)\b/.test(text))return 'build';
 if(/\b(?:check|calculate|score|compare|assess|evaluate)\b.{0,65}\b(?:resume|cv|ats|fit|compatibility)\b/.test(text)||/^(?:my )?(?:ats score|resume score|jd fit)[?.!\s]*$/.test(text))return 'score';
 return null;
}
