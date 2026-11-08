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
    assert.ok(source.includes('/manifest.webmanifest?v=3'),file);
    assert.ok(source.includes('/js/pwa.js?v=3'),file);
    assert.ok(source.includes('/images/vistavilla-app-180.png'),file);
    assert.ok(!/wish\s*me\s*well\s+apartment/i.test(source),file);
    ejs.compile(source,{filename:file});
   }
  }
 }
 scan('views');
});
test('installed app opens portal and shortcuts remain inside full-app scope',()=>{
 const manifest=JSON.parse(fs.readFileSync('views/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');
 assert.equal(manifest.start_url,'/portal/dashboard');
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
