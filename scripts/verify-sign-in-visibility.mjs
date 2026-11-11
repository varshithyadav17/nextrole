import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(import.meta.resolve('wrangler/package.json'))('esbuild');
const {createElement}=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../app/login/sign-in-methods.tsx',import.meta.url))],bundle:true,format:'cjs',platform:'node',packages:'external',write:false,jsx:'automatic',logLevel:'silent'});
const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,module,module.exports);
const Component=module.exports.default,returnTo='/admin?section=overview';let checks=0;
for(const initial of [
 {emailReady:false,googleReady:false,googleOnly:false,googleExternal:false,googleOrigin:'',serviceUnavailable:true},
 {emailReady:true,googleReady:true,googleOnly:false,googleExternal:false,googleOrigin:''},
 {emailReady:true,googleReady:false,googleOnly:false,googleExternal:false,googleOrigin:'',serviceUnavailable:false},
]){
 const html=renderToStaticMarkup(createElement(Component,{initial,returnTo}));
 assert.match(html,/<a\b[^>]*class="google-signin"[^>]*>/,'Google must appear in server-rendered HTML before client health checks.');checks++;
 assert.ok(html.indexOf('google-signin')<html.indexOf('email-auth-form'),'Google must remain above the regular email form.');checks++;
 assert.ok(html.includes('/auth/google?return_to='+encodeURIComponent(returnTo)),'The Google entry must preserve the requested destination.');checks++;
 assert.ok(html.includes('Show password')&&!html.includes('Continue with ChatGPT'),'The normal password control is retained without ChatGPT sign-in.');checks++;
}
console.log(JSON.stringify({passed:true,checks,scope:'Google sign-in is immediately visible before slow, failed or deferred readiness checks'}));
