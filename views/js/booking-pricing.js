(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BookingPricing=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function date(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Select valid check-in and checkout dates.');
  const time=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw Error('Invalid booking date.');return time;
 }
 function discount(rate,type,value){
  if(!['flat','percentage'].includes(type))throw Error('Choose a flat or percentage discount.');
  if(!/^\d+(?:\.\d{1,2})?$/.test(String(value)))throw Error('Enter a non-negative discount with at most two decimal places.');
  const number=Number(value);if(!Number.isFinite(number))throw Error('Invalid discount.');
  if(type==='percentage'&&number>100)throw Error('Percentage discount cannot exceed 100%.');
  const amount=type==='percentage'?Math.round(rate*number/100):Math.round(number*100);
  if(amount>rate)throw Error('Discount cannot exceed the booking subtotal.');return amount;
 }
 function quote(input){
  const nights=(date(input.end)-date(input.start))/86400000;
  if(!Number.isInteger(nights)||nights<1||nights>365)throw Error('Select between 1 and 365 nights.');
  const rate=Math.round(Number(input.rate)*100);if(!Number.isSafeInteger(rate)||rate<=0)throw Error('A valid room rate is required.');
  const type=input.discountType||'flat',value=input.discountValue===undefined?'0':input.discountValue;
  const subtotal=rate*nights,scope=input.discountScope==='night'?'night':'booking';
  const perNight=scope==='night'?discount(rate,type,value):0,totalDiscount=scope==='night'?perNight*nights:discount(subtotal,type,value),total=subtotal-totalDiscount;
  if(!Number.isSafeInteger(total))throw Error('Booking amount is too large.');
  return {nights,rate,subtotal,discountType:type,discountScope:scope,discountValue:Number(value),discountPerNight:perNight,discountTotal:totalDiscount,total};
 }
 return {quote,discount};
});
