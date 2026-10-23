/** Bound memory before parsing untrusted request or upstream JSON. */
export async function boundedJSON(input:Request|Response,maxBytes:number):Promise<any>{
 if(Number(input.headers.get('content-length')||0)>maxBytes)throw new Error('JSON size limit exceeded.');
 const reader=input.body?.getReader();if(!reader)throw new Error('Missing JSON body.');
 const decoder=new TextDecoder();let text='',bytes=0;
 try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('JSON size limit exceeded.');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 return JSON.parse(text);
}
