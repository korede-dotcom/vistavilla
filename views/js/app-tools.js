'use strict';
(function(){
 function initialize(){
  let root=document.getElementById('app-tools');
  if(root&&root.dataset.initialized)return;
  if(!root){
  root=document.createElement('div');root.id='app-tools';
  root.innerHTML='<section class="app-tools-panel" id="app-tools-panel" aria-label="App options" hidden><header><strong>App options</strong><button type="button" class="app-tools-close" aria-label="Close app options">×</button></header><div class="app-tools-actions"></div></section><button type="button" class="app-tools-launcher" aria-label="Open app options" aria-expanded="false" aria-controls="app-tools-panel"><span aria-hidden="true">⚙</span></button>';
  document.body.appendChild(root);
  }
  root.dataset.initialized='true';
  const panel=root.querySelector('.app-tools-panel'),launcher=root.querySelector('.app-tools-launcher'),actions=root.querySelector('.app-tools-actions');
  function close(focus=true){panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-label','Open app options');if(focus)launcher.focus();}
  launcher.addEventListener('click',()=>{if(!panel.hidden){close();return;}panel.hidden=false;launcher.setAttribute('aria-expanded','true');launcher.setAttribute('aria-label','Close app options');panel.querySelector('.app-tools-close').focus();});
  root.querySelector('.app-tools-close').addEventListener('click',()=>close());
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}});
  document.addEventListener('click',event=>{if(!panel.hidden&&!root.contains(event.target))close(false);});
  panel.addEventListener('click',event=>{if(event.target.closest('.pwa-install-button'))close(false);});
  function collect(){
   for(const selector of ['#theme-toggle','.pwa-install-button']){
    const control=document.querySelector(selector);
    if(control&&control.parentElement!==actions)actions.appendChild(control);
   }
  }
  collect();new MutationObserver(collect).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
