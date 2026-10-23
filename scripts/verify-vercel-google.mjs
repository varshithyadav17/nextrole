export async function verifyVercelGoogle({load,jar,check,config,user,token,issueSession,SESSION_COOKIE}){
 const {googleStart,googleLink,googleCallback,authOptions}=await load('lib/vercel-google.ts'),{base64url,verifyProof}=await load('lib/bridge/session.ts');
 const originalFetch=globalThis.fetch,oldId=process.env.GOOGLE_CLIENT_ID,oldSecret=process.env.GOOGLE_CLIENT_SECRET,encoder=new TextEncoder();
 const clientId='123456789.apps.googleusercontent.com';let googleCalls=0,exchanges=0,activeNonce='',seenPacket=null;
 try{
  delete process.env.GOOGLE_CLIENT_ID;delete process.env.GOOGLE_CLIENT_SECRET;
  check((await googleStart(new Request(config.audience+'/auth/google'))).headers.get('Location').includes('google-not-ready'),'An unconfigured Google button never pretends authentication works.');
  process.env.GOOGLE_CLIENT_ID=clientId;process.env.GOOGLE_CLIENT_SECRET='synthetic_secret_for_vercel_only';
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'synthetic-vercel',use:'sig',alg:'RS256'};
  globalThis.fetch=async(input,init)=>{
   const url=String(input);
   if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[key]});
   if(url==='https://oauth2.googleapis.com/token'){
    googleCalls++;const now=Math.floor(Date.now()/1000),a=base64url(encoder.encode(JSON.stringify({alg:'RS256',kid:key.kid}))),b=base64url(encoder.encode(JSON.stringify({iss:'https://accounts.google.com',aud:clientId,sub:'synthetic-vercel-subject',email:'google@example.test',email_verified:true,name:'Synthetic Google User',nonce:activeNonce,iat:now,exp:now+3600}))),value=a+'.'+b;
    return Response.json({token_type:'Bearer',access_token:'synthetic-unused-access',expires_in:3600,id_token:value+'.'+base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,encoder.encode(value))))});
   }
   if(url===config.issuer+'/api/bridge/google'){
    exchanges++;const body=JSON.parse(init.body);check(await verifyProof(config,'google-identity-v1',body.payload,body.signature)&&init.redirect==='error','The Google callback signs its server-to-server identity packet and refuses redirects.');
    seenPacket=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.payload.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
    return Response.json({session:await issueSession(config,seenPacket.mode==='link'?user:{...user,userId:'google:synthetic-vercel'})});
   }
   if(url===config.issuer+'/api/auth/options')return Response.json({linked:true});
   throw new Error('Unexpected network call in isolated Vercel Google checks.');
  };
  const deep='/jobs/greenhouse%3A123?view=review&q=SQL',login=await googleStart(new Request(config.audience+'/auth/google?return_to='+encodeURIComponent(deep))),authorize=new URL(login.headers.get('Location')),pending=login.cookies.get('__Host-nextrole-google');
  activeNonce=authorize.searchParams.get('nonce');jar.set('__Host-nextrole-google',pending.value);
  check(authorize.origin==='https://accounts.google.com'&&pending.httpOnly&&pending.secure&&authorize.searchParams.get('redirect_uri')===config.audience+'/auth/google/callback','Google uses the registered canonical callback and a Secure HttpOnly transaction cookie.');
  const callback=new URL(config.audience+'/auth/google/callback?code=synthetic-code&state='+authorize.searchParams.get('state'));
  check((await googleCallback(new Request(callback.href.replace(/state=.*/,'state=wrong')))).headers.get('Location').includes('google-failed')&&googleCalls===0,'Forged Google callback state stops before code exchange.');
  const complete=await googleCallback(new Request(callback));check(complete.status===303&&complete.headers.get('Location')===config.audience+deep&&complete.cookies.get(SESSION_COOKIE)?.value&&complete.cookies.get('__Host-nextrole-google')?.maxAge===0,'Google sign-in stores a verified app session, clears transaction state and restores the exact job URL.');
  check(seenPacket.mode==='login'&&seenPacket.previousSession===null&&!complete.headers.get('Set-Cookie').includes('synthetic-unused-access'),'Google OAuth access tokens are not stored in browser cookies or silently linked to an existing account.');
  jar.delete('__Host-nextrole-google');check((await googleCallback(new Request(callback))).headers.get('Location').includes('google-failed'),'A callback without its browser transaction cookie cannot complete again.');
  const before=exchanges;check((await googleLink(new Request(config.audience+'/auth/google/link',{method:'POST',headers:{Origin:'https://evil.test'}}))).status===403&&exchanges===before,'Cross-site Google-link requests cannot change account connections.');
  jar.set(SESSION_COOKIE,token);const linking=await googleLink(new Request(config.audience+'/auth/google/link',{method:'POST',headers:{Origin:config.audience}})),linkURL=new URL(linking.headers.get('Location'));
  activeNonce=linkURL.searchParams.get('nonce');jar.set('__Host-nextrole-google',linking.cookies.get('__Host-nextrole-google').value);
  const linked=await googleCallback(new Request(config.audience+'/auth/google/callback?code=synthetic-link-code&state='+linkURL.searchParams.get('state')));
  check(linked.headers.get('Location')===config.audience+'/?tab=settings&settings=alerts'&&seenPacket.mode==='link'&&seenPacket.previousSession===token,'Connecting Google is bound to the existing verified app session and returns to account settings.');
  const options=await(await authOptions()).json();check(options.googleReady&&options.linked&&!JSON.stringify(options).includes(process.env.GOOGLE_CLIENT_SECRET),'Sign-in settings expose connection state, never server credentials.');
  const alias=await googleStart(new Request('https://alias.vercel.app/auth/google'));check(alias.headers.get('Location').startsWith(config.audience+'/auth/google')&&!alias.cookies.get('__Host-nextrole-google'),'Google sign-in begins on the canonical app origin before transaction cookies are set.');
 }finally{globalThis.fetch=originalFetch;if(oldId===undefined)delete process.env.GOOGLE_CLIENT_ID;else process.env.GOOGLE_CLIENT_ID=oldId;if(oldSecret===undefined)delete process.env.GOOGLE_CLIENT_SECRET;else process.env.GOOGLE_CLIENT_SECRET=oldSecret;jar.delete('__Host-nextrole-google');jar.set(SESSION_COOKIE,token);}
}
