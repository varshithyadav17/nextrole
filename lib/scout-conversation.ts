import type {ChatTurn} from './ai-router';
export const SCOUT_MESSAGE_LIMIT=6000;
export const SCOUT_HISTORY_CHARACTERS=24000;
export const redactScout=(text:string)=>text.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email omitted]').replace(/\+?\d[\d ()-]{8,}\d/g,'[phone omitted]').replace(/(?:sk-(?:proj-)?|gsk_|AIza|nr_companion_)[A-Za-z0-9_-]{12,}/g,'[credential omitted]');
/** Bounded replay of this thread only; the latest user turn is never dropped. */
export function scoutConversation(messages:readonly {role:'user'|'assistant';text:string;attachment?:{name:string}}[]):ChatTurn[]{
 const turns:ChatTurn[]=[];let remaining=SCOUT_HISTORY_CHARACTERS;
 for(const message of messages.slice(-24).reverse()){
  const text=redactScout([message.attachment?'[Résumé attached: '+message.attachment.name+']':'',message.text].filter(Boolean).join('\n')).slice(0,SCOUT_MESSAGE_LIMIT);
  if(!text)continue;if(text.length>remaining)break;
  turns.unshift({role:message.role,text});remaining-=text.length;
 }
 while(turns[0]?.role==='assistant')turns.shift();
 return turns;
}
/** An explicit pasted JD in general chat remains a private description, never a listing. */
export function pastedScoutJD(message:string){
 const match=message.match(/^(?:(?:here(?:['’]s| is)|this is|use)\s+(?:(?:the|my|a)\s+)?)?(?:job\s+description|jd)\s*[:\n]\s*([\s\S]+)$/i);
 return match&&match[1].trim().length>=80?match[1].trim():null;
}
