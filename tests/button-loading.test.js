'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
function setup(){
 const listeners={},windowListeners={},requests=[];let observe;
 const window={fetch:()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),addEventListener:(type,fn)=>{windowListeners[type]=fn;},MutationObserver:class{constructor(fn){observe=fn;}observe(){}}};
 window.XMLHttpRequest=class{constructor(){this.handlers={};}addEventListener(name,fn){this.handlers[name]=fn;}send(){this.sent=true;}};
 const context={window,document:{documentElement:{},addEventListener:(type,fn)=>{listeners[type]=fn;}},setTimeout:(fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref();return timer;},clearTimeout,Promise};
 vm.createContext(context);vm.runInContext(fs.readFileSync('views/js/button-loading.js','utf8'),context);
 function button(){const attributes={},classes=new Set();return {tagName:'BUTTON',disabled:false,innerHTML:'Save booking',classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},getAttribute:name=>attributes[name]??null,setAttribute:(name,value)=>{attributes[name]=value;},removeAttribute:name=>{delete attributes[name];},hasAttribute:name=>name in attributes,closest(){return this;}};}
 function click(node){const event={target:node,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};listeners.click(event);return event;}
 return {window,windowListeners,listeners,requests,button,click,observe:node=>observe([{target:node}])};
}
test('fetch actions show a loader, block double clicks, preserve labels and restore accessibility after completion',async()=>{
 const app=setup(),button=app.button();app.click(button);const request=app.window.fetch('/save');
 assert.equal(button.getAttribute('aria-busy'),'true');assert.equal(app.click(button).stopped,true);assert.equal(button.innerHTML,'Save booking');assert.equal(button.disabled,false);
 app.requests[0].resolve({ok:true});await request;await tick();
 assert.equal(button.classList.contains('app-action-loading'),false);assert.equal(button.getAttribute('aria-busy'),null);assert.equal(button.getAttribute('aria-disabled'),null);
});
test('failed requests clear loaders and multiple requests keep the same button busy until all finish',async()=>{
 const app=setup(),button=app.button();app.click(button);const first=app.window.fetch('/first'),second=app.window.fetch('/second').catch(()=>null);
 app.requests[0].resolve({});await first;await tick();assert.equal(button.getAttribute('aria-busy'),'true');
 app.requests[1].reject(Error('offline'));await second;await tick();assert.equal(button.getAttribute('aria-busy'),null);
});
test('existing disabled state drives image-processing/download loaders without enabling controls incorrectly',async()=>{
 const app=setup(),button=app.button();app.click(button);button.disabled=true;app.observe(button);
 assert.equal(button.getAttribute('aria-busy'),'true');await tick();assert.equal(button.disabled,true);
 button.disabled=false;app.observe(button);assert.equal(button.getAttribute('aria-busy'),null);
});
test('cancelled form validation does not leave a spinner and browser back resets busy indicators',async()=>{
 const app=setup(),button=app.button();
 const event={target:{},submitter:button,defaultPrevented:false};app.listeners.submit(event);event.defaultPrevented=true;
 await tick();assert.equal(button.getAttribute('aria-busy'),null);
 app.click(button);const request=app.window.fetch('/pending');assert.equal(button.getAttribute('aria-busy'),'true');
 app.windowListeners.pageshow();assert.equal(button.getAttribute('aria-busy'),null);
 app.requests[0].resolve({});await request;
});
test('all document heads load shared button feedback, including portal and receipt layouts',()=>{
 function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(directory+'/'+entry.name):entry.name.endsWith('.ejs')?[directory+'/'+entry.name]:[]);}
 for(const file of files('views').filter(file=>!file.includes('/assets/'))){const source=fs.readFileSync(file,'utf8');if(/<head(?:\s[^>]*)?>/i.test(source)){assert.ok(source.includes('/js/button-loading.js'),file);assert.ok(source.includes('/css/button-loading.css'),file);}}
});

test('XHR actions and page navigation get loading feedback, while in-page tabs stay immediate',async()=>{
 const app=setup(),button=app.button();app.click(button);
 const xhr=new app.window.XMLHttpRequest();xhr.send();assert.equal(button.getAttribute('aria-busy'),'true');xhr.handlers.loadend();assert.equal(button.getAttribute('aria-busy'),null);
 const link=app.button();link.tagName='A';link.setAttribute('href','/portal/all-rooms');app.click(link);await tick();assert.equal(link.getAttribute('aria-busy'),'true');
 app.windowListeners.pageshow();assert.equal(link.getAttribute('aria-busy'),null);
 const tab=app.button();tab.tagName='A';tab.setAttribute('href','#room');app.click(tab);await tick();assert.equal(tab.getAttribute('aria-busy'),null);
});
