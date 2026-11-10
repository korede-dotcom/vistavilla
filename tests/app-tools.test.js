'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('one round launcher contains existing install/theme controls and supports open, close and Escape',()=>{
 const events={},nodes={};
 function node(name){return {name,children:[],attrs:{},hidden:false,listeners:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},appendChild(child){if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(x=>x!==child);this.children.push(child);child.parentElement=this;nodes[child.id||child.name]=child;},querySelector(selector){return mapping[selector];},contains(target){return target===this||this.children.some(child=>child.contains(target));},focus(){this.focused=true;}};}
 const mapping={};const root=node('root'),panel=node('panel'),launcher=node('launcher'),actions=node('actions'),close=node('close');root.id='app-tools';panel.hidden=true;
 root.appendChild(panel);root.appendChild(launcher);panel.appendChild(actions);panel.appendChild(close);
 Object.assign(mapping,{'.app-tools-panel':panel,'.app-tools-launcher':launcher,'.app-tools-actions':actions,'.app-tools-close':close});
 const theme=node('theme'),install=node('install'),body=node('body');body.appendChild(theme);body.appendChild(install);
 const document={readyState:'complete',getElementById:id=>id==='app-tools'?null:nodes[id],createElement:()=>root,body,querySelector:selector=>selector==='#theme-toggle'?theme:selector==='.pwa-install-button'?install:null,addEventListener:(name,fn)=>{events[name]=fn;}};
 vm.runInNewContext(fs.readFileSync('views/js/app-tools.js','utf8'),{document,MutationObserver:class{observe(){}}});
 assert.equal(theme.parentElement,actions);assert.equal(install.parentElement,actions);
 launcher.listeners.click();assert.equal(panel.hidden,false);assert.equal(launcher.attrs['aria-expanded'],'true');
 close.listeners.click();assert.equal(panel.hidden,true);assert.equal(launcher.focused,true);
 launcher.listeners.click();events.keydown({key:'Escape',preventDefault(){}});assert.equal(panel.hidden,true);
});
