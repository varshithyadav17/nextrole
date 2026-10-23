import type {ResumeDocument} from './career';
export type ResumeEdit={factId:string;detailIndex:number;text:string;quote:string;source?:'fact'|'user-confirmed'};
const grammar=new Set('a an the and or of for to in on at with by as is are was were be been being i my this that these those it its from into through using used use project application system tool software feature features developed developing built build created creating implemented implementing'.split(' '));
function tokens(text:string){return text.toLowerCase().match(/[a-z0-9+#]+/g)||[];}
function stem(word:string){return word.replace(/(?:ing|ed|s)$/,'');}
/** Conservative wording gate: content words and numeric claims must come from the original fact. Review is still required. */
export function supportedRewrite(original:string,text:string){
 if(!text.trim()||text.length>500||/https?:\/\/|(?:sk-(?:proj-)?|gsk_|AIza)[A-Za-z0-9_-]{12,}/.test(text))return false;
 const originalWords=new Set(tokens(original).map(stem));
 const nums=new Set(original.match(/\b\d+(?:[.,]\d+)?%?/g)||[]);
 if((text.match(/\b\d+(?:[.,]\d+)?%?/g)||[]).some(n=>!nums.has(n)))return false;
 return tokens(text).every(word=>originalWords.has(stem(word))||grammar.has(word));
}
export function applyResumeEdits(document:ResumeDocument,edits:ResumeEdit[]=[]):ResumeDocument{
 const copy=structuredClone(document);
 for(const edit of edits){const fact=copy.sections.flatMap(s=>s.facts).find(f=>f.id===edit.factId),original=fact?.details[edit.detailIndex];if(!fact||!original)continue;if(edit.source!=='user-confirmed'&&(!original.includes(edit.quote)||!supportedRewrite(original,edit.text)))continue;fact.details[edit.detailIndex]=edit.text;}
 return copy;
}
