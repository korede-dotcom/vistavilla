'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ejs = require('ejs');
test('every standalone page and admin head has the shared installable app setup', () => {
 function scan(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
   const file=dir+'/'+entry.name;
   if(entry.isDirectory())scan(file);
   else if(file.endsWith('.ejs')) {
    const source=fs.readFileSync(file,'utf8');
    if(!source.includes('<head>'))continue;
    assert.equal((source.match(/rel="manifest"/g)||[]).length,1,file);
    assert.ok(source.includes(file.startsWith('views/portal/') ? '/portal-manifest.webmanifest?v=1' : '/manifest.webmanifest?v=3'),file);
    assert.ok(source.includes('/js/pwa.js?v=4'),file);
    assert.ok(source.includes('/images/vistavilla-app-180.png'),file);
    assert.ok(!/wish\s*me\s*well\s+apartment/i.test(source),file);
    ejs.compile(source,{filename:file});
   }
  }
 }
 scan('views');
});
test('portal has its own install identity while the public app opens the website',()=>{
 const manifest=JSON.parse(fs.readFileSync('views/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');
 assert.equal(manifest.start_url,'/');
 const admin=JSON.parse(fs.readFileSync('views/portal-manifest.webmanifest','utf8'));
 assert.notEqual(admin.id,manifest.id);
 assert.equal(admin.start_url,'/portal');
 assert.equal(admin.scope,'/portal');
 assert.equal(admin.name,'Vistavilla Admin');
 assert.equal(manifest.name,'Vistavilla Apartments');
 assert.ok(manifest.shortcuts.some(s=>s.url==='/portal/calendar'));
 assert.ok(manifest.shortcuts.some(s=>s.url==='/'));
});
test('portal navigation gets offline page without storing private HTML or queuing writes',async()=>{
 const handlers={};let cached=[];let network=[];
 vm.runInNewContext(fs.readFileSync('views/sw.js','utf8'),{
  URL,
  self:{location:{origin:'https://example.com'},addEventListener:(event,fn)=>{handlers[event]=fn;}},
  caches:{match:async file=>{cached.push(file);return 'OFFLINE';}},
  fetch:async req=>{network.push(req.url);throw Error('Disconnected');}
 });
 let response;
 handlers.fetch({request:{method:'GET',url:'https://example.com/portal/dashboard',mode:'navigate'},respondWith:p=>{response=p;}});
 assert.equal(await response,'OFFLINE');assert.deepEqual(cached,['/offline.html']);
 assert.deepEqual(network,['https://example.com/portal/dashboard']);
 handlers.fetch({request:{method:'POST',url:'https://example.com/portal/transfer-room',mode:'cors'},respondWith:()=>assert.fail('Intercepted write')});
 handlers.fetch({request:{method:'GET',url:'https://example.com/portal/part-payments/api',mode:'cors'},respondWith:()=>assert.fail('Intercepted private API')});
});
test('live portal responses are returned directly, without cache writes',async()=>{
 const handlers={};const result={status:200};
 vm.runInNewContext(fs.readFileSync('views/sw.js','utf8'),{
  URL,self:{location:{origin:'https://example.com'},addEventListener:(event,fn)=>{handlers[event]=fn;}},
  caches:{open:()=>assert.fail('Stored private response'),match:()=>assert.fail('Read private cached response')},fetch:async()=>result
 });
 let response;
 handlers.fetch({request:{method:'GET',url:'https://example.com/portal/dashboard',mode:'navigate'},respondWith:p=>{response=p;}});
 assert.equal(await response,result);
});

test('portal install button opens a prompt captured before DOM readiness',async()=>{
 const events={},domEvents={},elements=[];
 let prompted=0,modals=0,prevented=0;
 const action={hidden:false,addEventListener:(name,fn)=>{action[name]=fn;}};
 const section={hidden:false};
 function element(){return {hidden:false,setAttribute(){},addEventListener(name,fn){this[name]=fn;},querySelector(){return {textContent:''};},showModal(){modals++;},close(){}};}
 const document={readyState:'loading',addEventListener:(name,fn)=>{domEvents[name]=fn;},createElement:()=>{const item=element();elements.push(item);return item;},querySelectorAll:selector=>selector==='[data-pwa-install]'?[action]:[section],body:{append(){}}};
 vm.runInNewContext(fs.readFileSync('views/js/pwa.js','utf8'),{document,location:{pathname:'/portal'},navigator:{},console,window:{addEventListener:(name,fn)=>{events[name]=fn;},matchMedia:()=>({matches:false})}});
 events.beforeinstallprompt({preventDefault(){prevented++;},prompt:async()=>{prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
 domEvents.DOMContentLoaded();
 await action.click();
 assert.equal(prevented,1);assert.equal(prompted,1);assert.equal(modals,0);
 assert.equal(action.hidden,true);assert.equal(section.hidden,true);
});
