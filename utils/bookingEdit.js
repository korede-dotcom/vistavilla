'use strict';
function date(value){return new Date(value).toISOString().slice(0,10);}
function initial(booking){
 const nights=Number(booking.night);
 const discount=Number(booking.discount_total||Number(booking.discount_per_night||0)*nights);
 const subtotal=Number(booking.price_subtotal||Number(booking.amount)+discount);
 return {start:date(booking.start),end:date(booking.end),rate:(subtotal/100/nights).toFixed(2),
  discount_type:booking.discount_type||'flat',discount_value:booking.discount_scope==='booking'?Number(booking.discount_value||0):booking.discount_type==='percentage'?Number(booking.discount_value||0):discount/100,
  expected_version:new Date(booking.updatedAt).toISOString()};
}
function guest(input){
 const out={};
 for(const key of ['guest_name','guest_email','guest_phone','guest_address']){
  if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>255)throw Error('Enter valid guest details (up to 255 characters per field).');
  out[key]=input[key].trim();
 }
 if(out.guest_email!=='-'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.guest_email))throw Error('Enter a valid guest email, or - if unavailable.');
 const count=Number(input.guest_count);
 if(!Number.isInteger(count)||count<1||count>100)throw Error('Enter a valid guest count.');
 out.guest_count=count;
 return out;
}
function financialSnapshot(booking){
 return {start:new Date(booking.start).toISOString(),end:new Date(booking.end).toISOString(),nights:Number(booking.night),
  total:Number(booking.amount),amount_paid:Number(booking.amount_paid||0),balance:Number(booking.balance||0),
  subtotal:Number(booking.price_subtotal||0),discount_total:Number(booking.discount_total||0),
  discount_type:booking.discount_type,discount_value:Number(booking.discount_value||0),discount_scope:booking.discount_scope};
}
function dateAtSameTime(value,old){
 const next=new Date(value+'T00:00:00Z'),previous=new Date(old);
 next.setUTCHours(previous.getUTCHours(),previous.getUTCMinutes(),previous.getUTCSeconds(),previous.getUTCMilliseconds());
 return next;
}
module.exports={initial,guest,financialSnapshot,dateAtSameTime};
