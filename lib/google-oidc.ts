import * as oidc from 'openid-client';

export function googleConfiguration(clientId:unknown,clientSecret:unknown){
 if(typeof clientId!=='string'||!clientId.endsWith('.apps.googleusercontent.com')||clientId.length>256||typeof clientSecret!=='string'||clientSecret.length<16||clientSecret.length>512)return null;
 const config=new oidc.Configuration({issuer:'https://accounts.google.com',authorization_endpoint:'https://accounts.google.com/o/oauth2/v2/auth',token_endpoint:'https://oauth2.googleapis.com/token',jwks_uri:'https://www.googleapis.com/oauth2/v3/certs',response_types_supported:['code'],id_token_signing_alg_values_supported:['RS256']},clientId,{client_secret:clientSecret,id_token_signed_response_alg:'RS256'});
 config.timeout=15;
 config[oidc.customFetch]=async(url,options)=>{
  if(!['https://oauth2.googleapis.com/token','https://www.googleapis.com/oauth2/v3/certs'].includes(String(url)))throw new Error('Unexpected identity endpoint.');
  return fetch(url,{...options,body:options.body as BodyInit,redirect:'error',cache:'no-store'});
 };
 oidc.enableNonRepudiationChecks(config);return config;
}
export async function googleAuthorization(config:oidc.Configuration,redirectUri:string){
 const verifier=oidc.randomPKCECodeVerifier(),state=oidc.randomState(),nonce=oidc.randomNonce();
 const url=oidc.buildAuthorizationUrl(config,{redirect_uri:redirectUri,scope:'openid email profile',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256',prompt:'select_account'});
 return {url,verifier,state,nonce};
}
export async function googleIdentity(config:oidc.Configuration,url:URL,saved:{verifier:string;state:string;nonce:string}){
 const tokens=await oidc.authorizationCodeGrant(config,url,{pkceCodeVerifier:saved.verifier,expectedState:saved.state,expectedNonce:saved.nonce,idTokenExpected:true}),claims=tokens.claims();
 if(!claims||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||claims.email_verified!==true||typeof claims.email!=='string'||claims.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email))throw new Error('Verified Google identity required.');
 return {subject:claims.sub,email:claims.email,fullName:typeof claims.name==='string'?claims.name.slice(0,200):null};
}
