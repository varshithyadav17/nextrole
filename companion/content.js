(()=>{
 if(!['job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com'].includes(location.hostname)||location.protocol!=='https:')return;
 if(globalThis.__nextroleScoutInstalled)return;globalThis.__nextroleScoutInstalled=true;
 const visible=e=>e.getClientRects().length>0;
 const fields=()=>Array.from(document.querySelectorAll('input,textarea,select')).filter(e=>!e.disabled&&!['hidden','submit','button','reset','image'].includes(e.type)&&(visible(e)||e.type==='file')).slice(0,80);
 function snapshot(){return fields().map((el,index)=>{if(!el.dataset.scoutField)el.dataset.scoutField=crypto.randomUUID();const labels=el.labels?Array.from(el.labels).map(l=>l.innerText.trim()).join(' '):'';return {id:el.dataset.scoutField,name:el.name||el.id||'',label:(labels||el.getAttribute('aria-label')||el.placeholder||el.name||'Unlabelled field '+index).slice(0,500),type:el.type||el.tagName.toLowerCase(),required:el.required||el.getAttribute('aria-required')==='true',valid:el.validity?.valid!==false,value:el.type==='file'?(el.files?.[0]?.name||''):el.type==='checkbox'||el.type==='radio'?el.checked?'checked':'':el.value||'',options:el.tagName==='SELECT'?Array.from(el.options).map(o=>({value:o.value,text:o.text})):undefined};});}
 function state(){const text=(document.body?.innerText||'').slice(0,150000),confirmation=text.match(/[^\n]*(?:application (?:has been |was |is )?(?:submitted|received)|thank you for applying|successfully (?:submitted|applied))[^\n]*/i)?.[0]||'';const captcha=Array.from(document.querySelectorAll('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],[data-sitekey]')).some(visible);return {closed:/no longer accepting applications|this (?:position|role) (?:has been filled|is closed)/i.test(text),fields:snapshot(),url:location.href,confirmation:confirmation.slice(0,500),captcha};}
 chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id!==chrome.runtime.id)return;
  try{
   if(['scout-fill','scout-submit'].includes(message.kind)){const expected=new URL(message.expectedUrl),base=expected.pathname.replace(/\/apply\/?$/,'').replace(/\/$/,'');if(location.origin!==expected.origin||!(location.pathname===base||location.pathname.startsWith(base+'/')))throw new Error('The job page changed. Review it yourself.');}
   if(message.kind==='scout-scan')respond(state());
   if(message.kind==='scout-fill'){
    const current=state();if(current.closed||current.captcha||current.confirmation)throw new Error('The employer page needs your review.');
    for(const fill of message.plan.fills){const element=fields().find(e=>e.dataset.scoutField===fill.id);if(!element)continue;
     if(fill.file){const raw=atob(message.resume.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),transfer=new DataTransfer();transfer.items.add(new File([bytes],message.resume.filename,{type:'application/pdf'}));element.files=transfer.files;}
     else if(element.tagName==='SELECT'){const option=Array.from(element.options).find(o=>o.text.toLowerCase().trim()===String(fill.value).toLowerCase().trim()||o.value===fill.value);if(option)element.value=option.value;}
     else{const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')?.set?.call(element,fill.value);}
     element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
    }
    respond(state());
   }
   if(message.kind==='scout-submit'){
    const current=state();if(current.closed||current.captcha||current.confirmation||current.fields.some(f=>f.required&&!f.value)||current.fields.some(f=>f.required&&['checkbox','radio'].includes(f.type)))throw new Error('The form needs human review.');
    const upload=fields().find(e=>e.type==='file'&&e.files?.length),form=upload?.closest('form');if(!form)throw new Error('A supported application form was not found.');
    if(!form.checkValidity())throw new Error('The employer form reports validation errors. Review the fields.');
    const button=Array.from(form.querySelectorAll('button,input[type=submit]')).find(e=>visible(e)&&!e.disabled&&/^(submit application|submit|apply|apply now|send application)$/i.test((e.innerText||e.value||'').trim()));
    if(!button)throw new Error('A supported submission control was not found.');button.click();respond({clicked:true});
   }
  }catch(error){respond({error:error.message});}
 });
})();
