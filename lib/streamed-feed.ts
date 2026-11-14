/** Read a top-level array without retaining the rest of a large global job board. */
export async function readObjectArray(response:Response,key:string,onRecord:(value:Record<string,unknown>)=>void,maxBytes=48*1024*1024){
 if(Number(response.headers.get('content-length')||0)>maxBytes){await response.body?.cancel();throw new Error('Employer feed exceeds the transfer budget');}
 const reader=response.body?.getReader();if(!reader)throw new Error('Missing employer feed');
 const decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,skeleton='',currentKey='',keyBuffer='',captureKey=false,inString=false,escaped=false,last='',array=false,arrayState:'first'|'value'|'comma'='first',item='',itemString=false,itemEscaped=false,count=0,found=false;
 const stack:string[]=[],itemStack:string[]=[];
 function consume(text:string){for(const c of text){
  if(array){
   if(itemStack.length){item+=c;if(item.length>768*1024)throw new Error('Employer posting exceeds the record budget');if(itemString){if(itemEscaped)itemEscaped=false;else if(c==='\\')itemEscaped=true;else if(c==='"')itemString=false;continue;}if(c==='"'){itemString=true;continue;}if(c==='{'||c==='[')itemStack.push(c);else if(c==='}'||c===']'){if(itemStack.pop()!==(c==='}'?'{':'['))throw new Error('Malformed employer posting');if(!itemStack.length){const value=JSON.parse(item);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid employer posting');if(++count>10000)throw new Error('Employer feed exceeds the index budget');onRecord(value);item='';arrayState='comma';}}continue;}
   if(/\s/.test(c))continue;
   if(c===']'&&arrayState!=='value'){array=false;last=']';continue;}
   if(c===','&&arrayState==='comma'){arrayState='value';continue;}
   if(c==='{'&&arrayState!=='comma'){item='{';itemStack.push('{');continue;}
   throw new Error('Malformed employer job array');
  }
  if(skeleton.length>512*1024)throw new Error('Employer feed metadata exceeds the budget');
  if(inString){skeleton+=c;if(captureKey)keyBuffer+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"'){inString=false;if(captureKey){currentKey=JSON.parse(keyBuffer);captureKey=false;}}continue;}
  if(c==='"'){inString=true;captureKey=stack.length===1&&(last==='{'||last===',');keyBuffer='"';skeleton+=c;continue;}
  if(c==='['&&stack.length===1&&currentKey===key&&last===':'){if(found)throw new Error('Repeated employer job array');found=true;array=true;arrayState='first';skeleton+='[]';continue;}
  skeleton+=c;
  if(c==='{'||c==='[')stack.push(c);else if(c==='}'||c===']'){if(stack.pop()!==(c==='}'?'{':'['))throw new Error('Malformed employer feed');}
  if(!/\s/.test(c))last=c;
 }}
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>maxBytes)throw new Error('Employer feed exceeds the transfer budget');consume(decoder.decode(chunk.value,{stream:true}));}consume(decoder.decode());if(!found||array||itemStack.length||stack.length||inString)throw new Error('Incomplete employer feed');const metadata=JSON.parse(skeleton);if(!metadata||Array.isArray(metadata)||metadata.error||metadata.errors||metadata.success===false)throw new Error('Invalid employer feed');return{metadata,count,bytes};}
 catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}
