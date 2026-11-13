'use strict';
(function(){
 const form=document.getElementById('editBookingForm');if(!form)return;
 const summary=document.getElementById('bookingEditSummary'),save=document.getElementById('saveBookingEdit'),preview=document.getElementById('previewBookingEdit');
 let revision=0,previewed=null;
 const payload=()=>Object.fromEntries(new FormData(form).entries());
 const money=value=>(value/100).toLocaleString('en-NG',{style:'currency',currency:'NGN'});
 function invalidate(){revision++;previewed=null;save.disabled=true;form.querySelectorAll('[data-edit-value]').forEach(item=>{item.textContent='—';});summary.textContent='Recalculate to review the latest changes.';}
 form.addEventListener('input',invalidate);
 form.addEventListener('change',invalidate);
 async function request(action,body){
  const response=await fetch('/portal/edit-booking/'+encodeURIComponent(form.dataset.reference)+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await window.portalResponseJSON(response);if(!response.ok||!result.status)throw Error(result.message||'Unable to edit this booking.');return result;
 }
 preview.addEventListener('click',async()=>{
  if(!form.reportValidity())return;const current=++revision;previewed=null;save.disabled=true;summary.textContent='Calculating totals and checking room availability…';
  const body=payload();
  try{
   const result=await request('/quote',body);if(current!==revision)return;
   const q=result.data;previewed=JSON.stringify(body);
   form.querySelectorAll('[data-edit-value]').forEach(item=>{ item.textContent=money(q[item.dataset.editValue]); });
   summary.textContent=`${q.nights} night(s). Calculation verified. Caution fees are unchanged. You can now save these changes.`;
   save.disabled=false;
  }catch(error){if(current===revision)summary.textContent=error.message;}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;const body=payload();
  if(!previewed||previewed!==JSON.stringify(body)){save.disabled=true;summary.textContent='Calculate changes before saving.';return;}
  save.disabled=true;preview.disabled=true;
  try{await request('',body);window.location.href='/portal/check-in?key='+encodeURIComponent(form.dataset.reference);}
  catch(error){summary.textContent=error.message;preview.disabled=false;previewed=null;}
 });
})();
