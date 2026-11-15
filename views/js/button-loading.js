'use strict';
(function(){
 if(window.AppButtonLoading)return;
 const states=new Map();let action=null;
 const selector='button,input[type="submit"],input[type="button"],a[href],[role="button"]';
 function stateFor(node){
  if(!node||node.disabled)return null;
  let state=states.get(node);
  if(!state){state={node,pending:0,busy:false};states.set(node,state);}
  return state;
 }
 function start(state){
  if(!state||state.busy)return;
  states.set(state.node,state);
  state.busy=true;
  state.ariaBusy=state.node.getAttribute('aria-busy');state.ariaDisabled=state.node.getAttribute('aria-disabled');
  state.node.classList.add('app-action-loading');state.node.setAttribute('aria-busy','true');state.node.setAttribute('aria-disabled','true');
 }
 function restore(node,name,value){if(value===null)node.removeAttribute(name);else node.setAttribute(name,value);}
 function stop(state){
  if(!state||state.pending||state.nativeDisabled)return;
  clearTimeout(state.timer);
  if(state.busy){state.node.classList.remove('app-action-loading');restore(state.node,'aria-busy',state.ariaBusy);restore(state.node,'aria-disabled',state.ariaDisabled);state.busy=false;}
  if(states.get(state.node)===state)states.delete(state.node);
 }
 function begin(state){if(state){state.pending++;start(state);}return ()=>{if(state){state.pending=Math.max(0,state.pending-1);stop(state);}};}
 function remember(state){action=state;setTimeout(()=>{if(action===state)action=null;if(state&&!state.busy&&states.get(state.node)===state)states.delete(state.node);},0);}
 function feedback(node){node.classList.add('app-action-feedback');setTimeout(()=>node.classList.remove('app-action-feedback'),250);}
 document.addEventListener('click',event=>{
  const node=event.target.closest&&event.target.closest(selector);if(!node)return;
  const existing=states.get(node);
  if(existing&&existing.busy){event.preventDefault();event.stopImmediatePropagation();return;}
  if(node.disabled||node.getAttribute('aria-disabled')==='true')return;
  const state=stateFor(node);remember(state);feedback(node);
  // Normal page navigation also gets feedback; in-page tabs, menus and modal controls remain immediate.
  if(node.tagName==='A'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
   const href=node.getAttribute('href')||'';
   if(href&&!href.startsWith('#')&&!/^javascript:/i.test(href)&&!node.hasAttribute('data-toggle')&&!node.hasAttribute('data-dismiss')){
    setTimeout(()=>{if(event.defaultPrevented)return;start(state);state.timer=setTimeout(()=>stop(state),node.target==='_blank'||/^(tel:|mailto:|https:\/\/wa.me)/i.test(href)?1000:15000);},0);
   }
  }
 },true);
 document.addEventListener('submit',event=>{
  const form=event.target,node=event.submitter||form.querySelector('button[type="submit"],input[type="submit"],button:not([type])');
  const state=stateFor(node);if(!state)return;
  if(state.busy){event.preventDefault();event.stopImmediatePropagation();return;}
  remember(state);
  setTimeout(()=>{if(!event.defaultPrevented){start(state);state.timer=setTimeout(()=>stop(state),15000);}},0);
 },true);
 if(window.fetch){
  const original=window.fetch;
  window.fetch=function(...args){
   const finish=begin(action);
   try{return Promise.resolve(original.apply(this,args)).finally(()=>{setTimeout(finish,0);});}
   catch(error){finish();throw error;}
  };
 }
 if(window.XMLHttpRequest){
  const original=window.XMLHttpRequest.prototype.send;
  window.XMLHttpRequest.prototype.send=function(...args){
   const finish=begin(action);let done=false;
   const complete=()=>{if(!done){done=true;finish();}};
   this.addEventListener('loadend',complete,{once:true});
   try{return original.apply(this,args);}catch(error){complete();throw error;}
  };
 }
 // Existing screens also disable controls during image processing and downloads.
 // Observe their state rather than changing their HTML or overriding business rules.
 if(window.MutationObserver){
  new window.MutationObserver(records=>{
   records.forEach(record=>{
    const state=states.get(record.target);if(!state)return;
    state.nativeDisabled=Boolean(record.target.disabled);
    if(state.nativeDisabled)start(state);else stop(state);
   });
  }).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['disabled']});
 }
 window.addEventListener('pageshow',()=>{states.forEach(state=>{state.pending=0;state.nativeDisabled=false;stop(state);});action=null;});
 // Available for actions that wait before starting their request (e.g. image processing).
 window.AppButtonLoading={run:async(node,task)=>{const state=stateFor(node);if(!state||state.busy)return;const finish=begin(state);try{return await task();}finally{finish();}}};
})();
