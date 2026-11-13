'use strict';
(function(){
 const form=document.getElementById('extendStayForm');if(!form)return;
 const nights=document.getElementById('extraNights'),paid=document.getElementById('extensionPaid'),option=document.getElementById('extensionOption'),output=document.getElementById('extensionQuote'),confirm=document.getElementById('confirmExtension');
 let quote=null,csrf=null,generation=0;
 const money=value=>(value/100).toLocaleString('en-NG',{style:'currency',currency:'NGN'});
 function display(){
  if(!quote)return;
  paid.max=(quote.due/100).toFixed(2);paid.readOnly=option.value==='full';
  if(paid.readOnly)paid.value=(quote.due/100).toFixed(2);
  const value=Math.round(Number(paid.value)*100);
  confirm.disabled=!paid.checkValidity()||!Number.isFinite(value)||value<0||value>quote.due;
  output.textContent=`New checkout: ${new Date(quote.new_end).toLocaleString()}. Total nights: ${quote.nights}. Added charges: ${money(quote.additional)}. New booking total: ${money(quote.total)}. Previously paid: ${money(quote.previousPaid)}. Balance after this payment: ${money(quote.due-value)}. Guest credit remaining: ${money(quote.credit)}.`;
 }
 nights.addEventListener('input',()=>{generation++;quote=null;confirm.disabled=true;output.textContent='Recalculate after changing nights.';});
 option.addEventListener('change',()=>{if(option.value==='partial')paid.value='0';display();});paid.addEventListener('input',display);
 document.getElementById('previewExtension').addEventListener('click',async()=>{
  if(!nights.reportValidity())return;const revision=++generation;confirm.disabled=true;quote=null;output.textContent='Checking availability and prices…';
  try{
   const params=new URLSearchParams({reference_id:form.dataset.reference,extra_nights:nights.value,expected_end:form.dataset.end});
   const response=await fetch('/portal/extend-stay/quote?'+params,{cache:'no-store'});const result=await window.portalResponseJSON(response);
   if(revision!==generation)return;if(!response.ok||!result.status)throw Error(result.message||'Unable to preview extension.');
   quote=result.data;csrf=result.csrf;display();
  }catch(error){if(revision===generation)output.textContent=error.message;}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!quote||!form.reportValidity())return;confirm.disabled=true;
  try{
   const response=await fetch('/portal/extend-stay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference_id:form.dataset.reference,expected_end:form.dataset.end,extra_nights:nights.value,amount_paid_now:paid.value,payment_option:option.value,payment_method:document.getElementById('extensionMethod').value,csrf})});
   const result=await window.portalResponseJSON(response);if(!response.ok||!result.status)throw Error(result.message||'Extension failed.');window.location.reload();
  }catch(error){output.textContent=error.message;confirm.disabled=false;}
 });
})();
