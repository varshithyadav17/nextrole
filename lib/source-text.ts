/** Decode the small set of HTML entities used in public job feeds, without a DOM or HTML execution. */
export function decodeSourceEntities(value:string):string{
 const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',minus:'−',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',bull:'•',middot:'·',hellip:'…'};
 let text=value;
 // Some ATS feeds escape their HTML a second time. Keep decoding bounded.
 for(let pass=0;pass<2;pass++){
  const decoded=text.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]+);/gi,(entity,key:string)=>{
   if(key[0]!=='#')return named[key.toLowerCase()]??entity;
   const code=key[1]?.toLowerCase()==='x'?Number.parseInt(key.slice(2),16):Number(key.slice(1));
   return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):entity;
  });
  if(decoded===text)break;text=decoded;
 }
 return text;
}
