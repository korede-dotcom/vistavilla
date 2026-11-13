'use strict';
const allowed=['id','_id','booking_id','guest_name','room_number','old_room_number','new_room_number','reference_id','booking_reference','expense_name','amount','payment_amount','balance','balance_after','total_amount','new_total','old_total','amount_paid_now','added_nights','checked_in','checked_out','status','caution_fee_amount','caution_fee_status','room_name','category_name','name','roleName','caution_fee_default','amount_paid'];
function safeRecord(data){
 if(!data||typeof data!=='object')return {};
 return Object.fromEntries(allowed.filter(key=>['string','number','boolean'].includes(typeof data[key])).map(key=>[key,typeof data[key]==='string'?data[key].replace(/[\r\n\t]/g,' ').slice(0,150):data[key]]));
}
const money=value=>Number.isFinite(Number(value))?(Number(value)/100).toLocaleString('en-NG',{style:'currency',currency:'NGN'}):'';
function description(action,model,data={},fields=[],id){
 data=safeRecord(data);
 const verb=action.startsWith('create')?'Added':action.startsWith('delete')?'Deleted':'Updated';
 const guest=data.guest_name?' for '+data.guest_name:'';
 const room=data.room_number?' in Room '+data.room_number:'';
 const ref=data.reference_id||data.booking_reference;
 const reference=ref?' (booking '+ref+')':id!=null?' #'+id:'';
 const booking=guest+room+reference;
 if(model==='hotelbooking'){
  if(action.startsWith('create'))return 'Created booking'+booking+(data.amount!==undefined?' — total '+money(data.amount):'');
  if(action.startsWith('delete'))return 'Deleted booking'+booking;
  if(fields.includes('caution_fee_status'))return ({paid:'Recorded caution fee',hold:'Put caution fee on hold',refunded:'Marked caution fee refunded'}[data.caution_fee_status]||'Updated caution fee')+booking+(data.caution_fee_amount!==undefined?' — '+money(data.caution_fee_amount):'');
  if(fields.includes('checked_out')&&data.checked_out)return 'Checked out '+(data.guest_name||'guest')+room+reference;
  if(fields.includes('checked_in')&&data.checked_in)return 'Checked in '+(data.guest_name||'guest')+room+reference;
  if(fields.includes('status')&&data.status==='cancelled')return 'Cancelled booking'+booking;
  if(fields.includes('status')&&['success','confirmed'].includes(data.status)&&!fields.some(field=>['amount','balance','amount_paid','night','end'].includes(field)))return 'Validated booking'+booking;
  return 'Edited booking'+booking+(data.amount!==undefined?' — total '+money(data.amount):'')+(data.balance!==undefined?', balance '+money(data.balance):'');
 }
 if(model==='expense')return verb+' expense'+(data.expense_name?' “'+data.expense_name+'”':'')+(data.amount!==undefined?' — '+money(data.amount):'');
 if(model==='damage')return verb+' damage report'+room+(data.amount!==undefined?' — '+money(data.amount):'');
 if(model==='roomtransfer')return 'Transferred '+(data.guest_name||'guest')+' from Room '+(data.old_room_number||'?')+' to Room '+(data.new_room_number||'?')+reference+(data.new_total!==undefined?' — new total '+money(data.new_total):'');
 if(model==='stay_extension')return 'Extended stay'+guest+room+reference+' by '+(data.added_nights||'?')+' night(s)'+(data.balance_after!==undefined?' — balance '+money(data.balance_after):'');
 if(model==='booking_revision')return 'Saved booking edit'+guest+room+reference;
 if(model==='paymenthistory')return 'Recorded payment'+booking+(data.payment_amount!==undefined?' — '+money(data.payment_amount):'')+(data.balance_after!==undefined?', balance '+money(data.balance_after):'');
 if(model==='partpayment')return 'Updated outstanding payment'+booking+(data.balance!==undefined?' — balance '+money(data.balance):'');
 if(model==='roomnumber')return verb+' room'+(data.room_number?' '+data.room_number:'')+(data.room_name?' — '+data.room_name:'');
 if(model==='roomcategory')return verb+' room category'+(data.category_name?' “'+data.category_name+'”':'')+(fields.length?' — changed '+fields.filter(field=>field!=='updatedAt').map(field=>field==='picture'?'photos':field.replace(/_/g,' ')).join(', '):'');
 if(model==='hotel_setting')return 'Changed suggested caution fee'+(data.caution_fee_default!==undefined?' to '+money(data.caution_fee_default):'');
 const names={user:'user account',staff:'staff record',pricingconfig:'pricing configuration',marque:'promotion',landing_setting:'website content',Drink:'drink',DrinkLog:'bar sale',resetpassword:'password reset',booking_revision:'booking edit'};
 return verb+' '+(names[model]||String(model||'record').replace(/_/g,' '))+(data.name?' for '+data.name:'')+reference;
}
function requestDescription(method,path,failed){
 const routes=[[/\/edit-booking\//,'booking editor'],[/\/extend-stay/,'stay extension'],[/\/transfer-room/,'room transfer'],[/\/check-in/,'booking details / check-in'],[/\/check-booking|\/validate/,'booking validation'],[/\/expenses/,'expenses'],[/\/damages/,'damages'],[/\/caution-fees/,'caution fees'],[/\/part-payments|\/complete-payment/,'part payments'],[/\/pricing-config/,'pricing configuration'],[/\/promotion/,'promotions'],[/\/staff/,'staff'],[/\/dashboard/,'dashboard'],[/\/all-booking/,'booking list']];
 const label=(routes.find(([pattern])=>pattern.test(path||''))||[])[1]||String(path||'application').replace(/\//g,' ').trim();
 return failed?'Action failed: '+label:method==='GET'?'Viewed '+label:'Completed action: '+label;
}
module.exports={allowed,safeRecord,description,requestDescription};
