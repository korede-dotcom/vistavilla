'use strict';
(function(){
 function initialize(){
  const modal=document.getElementById('roomModal'),form=document.getElementById('payment_form');if(!modal||!form)return;
  const nav=modal.querySelector('.booking-step-nav'),body=modal.querySelector('.booking-dialog-body'),footer=modal.querySelector('.booking-dialog-footer');
  const next=modal.querySelector('.booking-next'),back=modal.querySelector('.booking-back'),submit=document.getElementById('submit_button'),caption=modal.querySelector('.booking-step-caption');
  const titles=['Stay','Guest','Payment'];
  const panels=titles.map((title,index)=>{const panel=document.createElement('div');panel.className='row booking-step-panel';panel.id='booking-step-'+index;panel.setAttribute('role','group');panel.setAttribute('aria-label',title);return panel;});
  Array.from(form.querySelector('.row').children).forEach(column=>{
   const stay=column.querySelector('#checkIn,#checkOut,#pricingInfoCard');
   const guest=column.querySelector('[name="guest_name"],[name="guest_phone"],[name="guest_email"],[name="guest_address"],#id_card');
   panels[stay?0:guest?1:2].appendChild(column);
  });
  form.replaceChildren(...panels);
  form.querySelectorAll('input,select').forEach(field=>{
   if(!field.id&&field.name)field.id='booking-'+field.name;
   if(['start','end','guest_name'].includes(field.name))field.required=true;
   const label=field.parentElement.querySelector('.form-label');
   if(label&&field.id&&!label.htmlFor)label.htmlFor=field.id;
  });
  let current=0,lastFocus=null;
  const tabs=titles.map((title,index)=>{const button=document.createElement('button');button.type='button';button.innerHTML='<span>'+(index+1)+'</span>'+title;button.setAttribute('aria-controls',panels[index].id);button.addEventListener('click',()=>moveTo(index));nav.appendChild(button);return button;});
  function show(index){current=index;panels.forEach((panel,i)=>{panel.hidden=i!==index;tabs[i].removeAttribute('aria-current');});tabs[index].setAttribute('aria-current','step');back.disabled=index===0;next.hidden=index===2;submit.hidden=index!==2;caption.textContent='Step '+(index+1)+' of 3';body.scrollTop=0;}
  function moveTo(index){
   for(let i=0;i<index;i++){
    const invalid=Array.from(panels[i].querySelectorAll('input,select')).find(field=>!field.checkValidity());
    if(invalid){show(i);invalid.reportValidity();return;}
   }
   show(index);
  }
  back.addEventListener('click',()=>show(Math.max(0,current-1)));
  next.addEventListener('click',()=>moveTo(Math.min(2,current+1)));
  form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName!=='TEXTAREA'){event.preventDefault();if(current<2)moveTo(current+1);else submit.click();}});
  const open=window.openModal,close=window.closeModal;
  window.openModal=function(...args){lastFocus=document.activeElement;document.getElementById('paymentContainer').replaceChildren();form.style.display='';nav.hidden=false;footer.hidden=false;open.apply(this,args);document.body.style.overflow='hidden';show(0);modal.querySelector('.booking-close').focus();};
  window.closeModal=function(){close();document.body.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus();};
  modal.addEventListener('click',event=>{if(event.target===modal)window.closeModal();});
  modal.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();window.closeModal();}
   if(event.key==='Tab'){
    const focusable=Array.from(modal.querySelectorAll('button,input,select,a[href],iframe')).filter(item=>!item.disabled&&!item.hidden&&item.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  });
  new MutationObserver(()=>{const checkout=!!document.querySelector('#paymentContainer iframe');nav.hidden=checkout;footer.hidden=checkout;}).observe(document.getElementById('paymentContainer'),{childList:true});
  show(0);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
