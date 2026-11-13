'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pricing=require('../views/js/booking-pricing');
const base={start:'2026-11-10',end:'2026-11-13',rate:50000};
test('flat discount is deducted once from the full booking subtotal',()=>{
 const q=pricing.quote({...base,discountType:'flat',discountValue:'5000.50'});
 assert.equal(q.nights,3);assert.equal(q.subtotal,15000000);assert.equal(q.discountPerNight,0);assert.equal(q.discountTotal,500050);assert.equal(q.total,14499950);
});
test('percentage discounts use the complete subtotal and support decimals',()=>{
 const q=pricing.quote({...base,discountType:'percentage',discountValue:'12.50'});
 assert.equal(q.discountPerNight,0);assert.equal(q.discountTotal,1875000);assert.equal(q.total,13125000);
 assert.equal(pricing.quote({...base,discountType:'percentage',discountValue:'100'}).total,0);
 assert.equal(pricing.discount(9999,'percentage','33.33'),3333);
});
test('invalid dates, negative and excessive discounts reject instead of producing misleading totals',()=>{
 for(const end of ['2026-11-10','2026-11-09','2026-02-30','invalid'])assert.throws(()=>pricing.quote({...base,end}));
 for(const discountValue of ['-1','100.01','NaN','1.001'])assert.throws(()=>pricing.quote({...base,discountType:'percentage',discountValue}));
 assert.throws(()=>pricing.quote({...base,discountType:'flat',discountValue:'150000.01'}));
 assert.throws(()=>pricing.quote({...base,discountType:'unknown',discountValue:0}));
});

test('booking form initializes and updates live totals using the server rate, not URL price',async()=>{
 const fs=require('fs'),vm=require('vm');const elements={};
 function element(id){return elements[id]||(elements[id]={value:['discount_per_night','amount_paid','caution_fee'].includes(id)?'0':id==='discount_type'?'flat':'',checked:false,style:{},listeners:{},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},setAttribute(){},removeAttribute(){},textContent:'',innerText:''});}
 const ready=[];const document={getElementById:element,querySelector:s=>element(s),addEventListener(name,fn){if(name==='DOMContentLoaded')ready.push(fn);}};
 const source=fs.readFileSync('views/portal/add-booking-category.ejs','utf8');
 const script=[...source.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)][0][1];
 let fetchedRate=50000;
 const context={document,URL,Date,console:{log(){},error(){}},BookingPricing:pricing,queueMicrotask,
  window:{location:{href:'https://example.com/portal/add-booking-category?id=1&price=1'}},
  fetch:async()=>({ok:true,status:200,text:async()=>JSON.stringify({status:true,data:{price:fetchedRate,hasSpecialPrice:false}})})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('views/js/portal-response.js','utf8'),context);vm.runInContext(script,context);ready.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));
 element('checkIn').value='2026-11-10';element('checkOut').value='2026-11-13';element('discount_type').value='percentage';element('discount_per_night').value='10';
 element('discount_per_night').listeners.input.forEach(fn=>fn({target:element('discount_per_night')}));await new Promise(resolve=>setImmediate(resolve));
 assert.ok(element('bookingPriceSummary').textContent.includes('3 night(s)'));
 assert.ok(element('bookingPriceSummary').textContent.includes('135,000'));
 assert.ok(element('bookingPriceSummary').textContent.includes('10%'));
 // Changing the selected date retrieves and uses the regular rate from the API.
 fetchedRate=40000;for(const fn of element('checkIn').listeners.change)await fn.call(element('checkIn'));await new Promise(resolve=>setImmediate(resolve));
 assert.ok(element('bookingPriceSummary').textContent.includes('108,000'));
});

test('percentage rounding occurs once on the complete booking subtotal',()=>{
 const q=pricing.quote({start:'2026-11-10',end:'2026-11-13',rate:99.99,discountType:'percentage',discountValue:'33.33'});
 assert.equal(q.subtotal,29997);assert.equal(q.discountTotal,9998);assert.equal(q.total,19999);
});
