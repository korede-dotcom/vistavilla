'use strict';
const clearForm=document.getElementById('clearBalanceForm'),clearMessage=document.getElementById('clearBalanceMessage'),clearConfirm=document.getElementById('confirmClearBalance');
let clearRequest=0;
document.addEventListener('click',async event=>{
 const button=event.target.closest('.clear-balance-button');if(!button)return;
 const request=++clearRequest;clearForm.reset();clearForm.dataset.id=button.dataset.id;clearForm.dataset.csrf='';clearConfirm.disabled=true;
 document.getElementById('clearBalanceSummary').textContent=`Clear ₦${(Number(button.dataset.balance)/100).toLocaleString('en-NG')} owed by ${button.dataset.guest}?`;
 clearMessage.textContent='Loading…';$('#clearBalanceModal').modal('show');
 try{
  const response=await fetch('/portal/clear-balance',{cache:'no-store'}),result=await window.portalResponseJSON(response);
  if(request!==clearRequest)return;if(!response.ok||!result.status)throw Error(result.message||'Unable to clear this balance.');
  clearForm.dataset.csrf=result.csrf;clearConfirm.disabled=false;clearMessage.textContent='';
 }catch(error){if(request===clearRequest)clearMessage.textContent=error.message;}
});
clearForm.addEventListener('submit',async event=>{
 event.preventDefault();clearConfirm.disabled=true;clearMessage.textContent='Clearing balance…';
 try{
  const response=await fetch('/portal/clear-balance/'+encodeURIComponent(clearForm.dataset.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:clearForm.dataset.csrf,reason:document.getElementById('clearBalanceReason').value})});
  const result=await window.portalResponseJSON(response);if(!response.ok||!result.status)throw Error(result.message||'Unable to clear balance.');window.location.reload();
 }catch(error){clearMessage.textContent=error.message;clearConfirm.disabled=false;}
});
