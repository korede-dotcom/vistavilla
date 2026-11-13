'use strict';
const exchangeButton=document.getElementById('openRoomExchange'),exchangeForm=document.getElementById('roomExchangeForm'),exchangeSelect=document.getElementById('exchangeOtherBooking'),exchangeMessage=document.getElementById('exchangeMessage'),exchangeConfirm=document.getElementById('confirmRoomExchange');
let exchangeData=null;
const exchangeMode=document.getElementById('exchangeMode');
function showExchangeTargets(){
 exchangeSelect.replaceChildren(new Option('Select a destination',''));exchangeConfirm.disabled=true;
 if(!exchangeData)return;
 if(exchangeMode.value==='free'){
  document.getElementById('exchangeTargetLabel').textContent='Available room';
  exchangeData.rooms.forEach(room=>exchangeSelect.add(new Option(`Room ${room.room_number} — ${room.room_name}`,room._id)));
 }else{
  document.getElementById('exchangeTargetLabel').textContent='Exchange with customer';
  exchangeData.bookings.filter(booking=>booking.reference_id!==exchangeButton.dataset.reference&&String(booking.room_id)!==exchangeButton.dataset.room).forEach(booking=>{
   const option=new Option(`Room ${booking.room_number} — ${booking.guest_name} (${booking.reference_id})`,booking.reference_id);option.dataset.room=booking.room_id;exchangeSelect.add(option);
  });
 }
 exchangeMessage.textContent=exchangeSelect.options.length===1?'No available destinations for this exchange type.':'';
}
exchangeMode.addEventListener('change',showExchangeTargets);
exchangeButton.addEventListener('click',async()=>{
 exchangeData=null;exchangeForm.reset();exchangeSelect.replaceChildren();exchangeConfirm.disabled=true;exchangeMessage.textContent='Loading checked-in customers…';$('#roomExchangeModal').modal('show');
 try{
  const response=await fetch('/portal/exchange-rooms?reference_id='+encodeURIComponent(exchangeButton.dataset.reference),{cache:'no-store'}),result=await window.portalResponseJSON(response);
  if(!response.ok||!result.status)throw Error(result.message||'Unable to load bookings.');
  exchangeForm.dataset.csrf=result.data.csrf;exchangeData=result.data;showExchangeTargets();
 }catch(error){exchangeMessage.textContent=error.message;}
});
exchangeSelect.addEventListener('change',()=>{exchangeConfirm.disabled=!exchangeSelect.value;});
exchangeForm.addEventListener('submit',async event=>{
 event.preventDefault();exchangeConfirm.disabled=true;exchangeMessage.textContent='Exchanging rooms…';
 try{
  const response=await fetch('/portal/exchange-rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:exchangeMode.value,new_room_id:exchangeMode.value==='free'?exchangeSelect.value:undefined,csrf:exchangeForm.dataset.csrf,reference_id:exchangeButton.dataset.reference,room_id:exchangeButton.dataset.room,other_reference:exchangeSelect.value,other_room_id:exchangeSelect.selectedOptions[0].dataset.room,reason:document.getElementById('exchangeReason').value})});
  const result=await window.portalResponseJSON(response);if(!response.ok||!result.status)throw Error(result.message||'Unable to exchange rooms.');window.location.reload();
 }catch(error){exchangeMessage.textContent=error.message;exchangeConfirm.disabled=false;}
});
