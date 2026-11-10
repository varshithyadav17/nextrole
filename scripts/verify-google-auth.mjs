export async function verifyGoogleAuth({database,check}){
 const {googleConfiguration,googleAuthorization,googleIdentity}=await import('../lib/google-oidc.ts');
 const {googleExchange,googleConnection}=await import('../lib/bridge/google.ts');
 const {bridgeConfig,issueSession,verifySession,proof,base64url,randomToken}=await import('../lib/bridge/session.ts');
 const {isHost}=await import('../lib/admin.ts');
 const config=bridgeConfig('8a'.repeat(32),'https://backend.example.test','https://nextrole.example.test'),clientId='123456789.apps.googleusercontent.com',secret='synthetic_google_secret_only',originalFetch=globalThis.fetch;
 const encoder=new TextEncoder(),pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'synthetic-google',alg:'RS256',use:'sig'};
 let claims={},calls=[];
 const token=async()=>{const a=base64url(encoder.encode(JSON.stringify({alg:'RS256',kid:jwk.kid}))),b=base64url(encoder.encode(JSON.stringify(claims))),message=a+'.'+b;return message+'.'+base64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,encoder.encode(message))));};
 const rejects=async f=>{try{await f();return false;}catch{return true;}};
 globalThis.fetch=async(input,init)=>{const url=String(input);calls.push({url,init});if(url==='https://oauth2.googleapis.com/token')return Response.json({access_token:'synthetic_access',token_type:'Bearer',expires_in:3600,id_token:await token()});if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[jwk]});throw new Error('Unexpected network request in synthetic Google auth test.');};
 const canonical={userId:'google-link-existing',email:'host@example.test',displayName:'Existing Student',fullName:'Existing Student'},other={...canonical,userId:'google-link-other'},subject='synthetic-subject-for-link';
 const signed=async(identity,mode='login',session=null,issuedAt=Date.now(),id=randomToken())=>{const payload=base64url(encoder.encode(JSON.stringify({identity,mode,previousSession:session,issuedAt,requestId:id})));return {payload,signature:await proof(config,'google-identity-v1',payload)};};
 try{
  check(!googleConfiguration(undefined,undefined)&&!googleConfiguration(clientId,'short'),'Google login stays unavailable without real server configuration.');
  const google=googleConfiguration(clientId,secret),auth=await googleAuthorization(google,config.audience+'/auth/google/callback');
  check(auth.url.origin==='https://accounts.google.com'&&auth.url.searchParams.get('scope')==='openid email profile'&&auth.url.searchParams.get('code_challenge_method')==='S256'&&auth.url.searchParams.get('nonce')===auth.nonce&&!auth.url.searchParams.has('access_type')&&!auth.url.href.includes(secret),'Google sign-in uses minimal scopes, S256, state and nonce without exposing the client secret.');
  const now=Math.floor(Date.now()/1000);claims={iss:'https://accounts.google.com',aud:clientId,sub:subject,email:'student@example.test',email_verified:true,name:'Synthetic Student',nonce:auth.nonce,iat:now,exp:now+3600};
  const callback=new URL(config.audience+'/auth/google/callback?code=synthetic-code&state='+auth.state),identity=await googleIdentity(google,callback,auth);
  check(identity.subject===subject&&identity.email==='student@example.test'&&calls.some(c=>c.url.endsWith('/certs')),'The real OIDC adapter verifies a signed Google ID token and its public key.');
  const exchanged=calls.find(c=>c.url.endsWith('/token'));check(String(exchanged.init.body).includes('code_verifier='+auth.verifier)&&String(exchanged.init.body).includes('client_secret='+secret)&&exchanged.init.redirect==='error','The server exchanges the code with PKCE and its secret only at the fixed token endpoint, refusing redirects.');
  const count=calls.length;check(await rejects(()=>googleIdentity(google,new URL(callback.href.replace(auth.state,'wrong-state')),auth))&&calls.length===count,'Mismatched OAuth state is rejected before provider access.');
  for(const [key,value]of [['nonce','wrong-nonce'],['aud','different-client'],['iss','https://evil.test'],['exp',now-100],['email_verified',false]]){const before={...claims};claims[key]=value;check(await rejects(()=>googleIdentity(google,callback,auth)),'Google identity rejects invalid '+key+'.');claims=before;}
  const beforeSignature=jwk.n;jwk.n='x'.repeat(jwk.n.length);const alteredConfig=googleConfiguration(clientId,secret);check(await rejects(()=>googleIdentity(alteredConfig,callback,auth)),'A Google token with an invalid signing key is rejected.');jwk.n=beforeSignature;
  const first=await googleExchange(config,await signed(identity)),firstUser=await verifySession(config,first.session);check(firstUser.userId.startsWith('google:')&&firstUser.email===identity.email,'A new Google account receives its own stable, namespaced workspace.');
  const again=await googleExchange(config,await signed({...identity,email:'changed@example.test'})),againUser=await verifySession(config,again.session);check(againUser.userId===firstUser.userId&&againUser.email==='changed@example.test','Google identity keeps a stable workspace while refreshing its currently verified contact email.');
  const canonicalToken=await issueSession(config,canonical),secondIdentity={...identity,subject:'synthetic-second-subject',email:canonical.email};
  const linked=await googleExchange(config,await signed(secondIdentity,'link',canonicalToken));check((await verifySession(config,linked.session)).userId===canonical.userId&&(await googleConnection(canonical.userId)).linked,'Connecting Google from an authenticated existing account preserves that exact workspace ID.');
  const returned=await googleExchange(config,await signed(secondIdentity));check((await verifySession(config,returned.session)).userId===canonical.userId,'Later Google sign-in restores the explicitly linked existing workspace.');
  check(await rejects(async()=>googleExchange(config,await signed(secondIdentity,'link',await issueSession(config,other)))),'A linked Google account cannot be reassigned to a different student.');
  check(await rejects(async()=>googleExchange(config,await signed({...secondIdentity,subject:'synthetic-third-subject'},'link',canonicalToken))),'Unique workspace constraints prevent a second Google connection from overwriting the first.');
  check(await rejects(async()=>googleExchange(config,await signed(identity,'link',null))),'Connecting Google requires a separately verified existing session.');
  const replay=await signed(identity);await googleExchange(config,replay);check(await rejects(()=>googleExchange(config,replay)),'An authenticated Google identity exchange is single-use.');
  check(await rejects(async()=>googleExchange(config,await signed(identity,'login',null,Date.now()-61000))),'Expired identity-exchange proofs cannot issue sessions.');
  const forged=await signed(identity);check(await rejects(()=>googleExchange(config,{...forged,signature:'forged'})),'A public request or Site bypass value cannot assert a Google identity.');
  const oldOwner=globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL;globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL=canonical.email;
  try{check(!isHost({...firstUser,email:canonical.email})&&isHost(canonical),'An unlinked Google login cannot acquire host privileges by matching an owner email.');}finally{globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL=oldOwner;}
 }finally{globalThis.fetch=originalFetch;await database.prepare("DELETE FROM google_accounts WHERE user_data LIKE '%Synthetic Student%' OR user_id=?").bind(canonical.userId).run();}
}
