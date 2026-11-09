'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let booking,ledger,conflict,writes,rate,specials;
const tx={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
function write(name,data,options){assert.equal(options.transaction,tx);writes.push({name,data});return data;}
stub('../config/connectDB',{transaction:async fn=>fn(tx)});
stub('../models/HotelBooking',{findOne:async options=>options.where.reference_id?booking:conflict,update:async(data,options)=>{write('booking',data,options);Object.assign(booking,data);}});
stub('../models/RoomNumbers',{findOne:async()=>({_id:1,is_retained:false})});
stub('../models/Room',{findOne:async()=>({price:rate})});
stub('../models/PricingConfig',{findOne:async()=>specials.length?specials.shift():null});
stub('../models/PartPayment',{findOne:async()=>ledger,create:async(data,options)=>{write('ledger',data,options);return {...data,_id:9};}});
stub('../models/PaymentHistory',{create:async(data,options)=>write('receipt',data,options)});
stub('../models/StayExtension',{create:async(data,options)=>write('extension',data,options)});
const extend=require('../services/extendStay');
const expected='2099-01-03T12:00:00.000Z';
const input={reference_id:'BOOK',expected_end:expected,extra_nights:1,amount_paid_now:'20000',payment_option:'partial',payment_method:'cash'};
function reset(){booking={id:7,reference_id:'BOOK',room_id:1,room_number:'101',room_name:'Suite',category_id:10,category_name:'Suite',night:2,start:new Date('2099-01-01T12:00:00Z'),end:new Date(expected),amount:6000000,amount_paid:6000000,balance:0,status:'success',guest_name:'Guest',guest_email:'g@example.com',guest_phone:'08000000000',discount_per_night:0};ledger=null;conflict=null;writes=[];rate=50000;specials=[];}
test('quote and partial extension calculate new checkout and preserve earlier receipts',async()=>{
 reset();const quote=await extend(input,{name:'Reception'},true);
 assert.equal(quote.new_end,'2099-01-04T12:00:00.000Z');assert.equal(quote.additional,5000000);assert.equal(quote.total,11000000);assert.equal(quote.due,5000000);assert.equal(writes.length,0);
 const result=await extend(input,{name:'Reception'});assert.equal(result.balance,3000000);
 assert.equal(booking.night,3);assert.equal(booking.amount_paid,8000000);assert.equal(booking.status,'part-payment');
 assert.equal(writes.find(w=>w.name==='ledger').data.end_date.toISOString(),result.new_end);
 assert.equal(writes.find(w=>w.name==='receipt').data.payment_amount,2000000);
 assert.equal(writes.find(w=>w.name==='extension').data.added_nights,1);
 await assert.rejects(extend(input,{name:'Reception'}),/changed/);
});
test('each added night uses its applicable special price and existing discount',async()=>{
 reset();booking.discount_per_night=500000;specials=[{special_price:'60000'},null];
 const quote=await extend({...input,extra_nights:2},{name:'Reception'},true);
 assert.deepEqual(quote.rates,[5500000,4500000]);assert.equal(quote.additional,10000000);assert.equal(quote.nights,4);
});
test('full payment closes balance, overpayments and overlaps reject before writes',async()=>{
 reset();await extend({...input,amount_paid_now:'50000',payment_option:'full'},{name:'Reception'});
 assert.equal(booking.balance,0);assert.equal(booking.status,'success');
 reset();await assert.rejects(extend({...input,amount_paid_now:'50000.01'},{name:'Reception'}),/exceeds/);assert.equal(writes.length,0);
 reset();conflict={id:10};await assert.rejects(extend(input,{name:'Reception'}),/reserved/);assert.equal(writes.length,0);
 reset();await assert.rejects(extend({...input,extra_nights:0},{name:'Reception'}),/nights/);
 reset();await assert.rejects(extend({...input,payment_option:'full'},{name:'Reception'}),/Full payment/);
});
test('existing ledger and downgrade credit are applied to extension charges without duplicate payment records',async()=>{
 reset();rate=10000;ledger={_id:9,amount_paid:8000000,update:async(data,options)=>{write('updatedLedger',data,options);return {...data,_id:9};}};
 const result=await extend({...input,amount_paid_now:'0',payment_option:'full'},{name:'Reception'});
 assert.equal(result.total,7000000);assert.equal(result.balance,0);assert.equal(result.credit,1000000);
 assert.ok(writes.some(w=>w.name==='updatedLedger'));assert.ok(!writes.some(w=>w.name==='ledger'));assert.ok(!writes.some(w=>w.name==='receipt'));
});

test('percentage discount carries onto extension special rates and records new totals',async()=>{
 reset();booking.discount_type='percentage';booking.discount_value=10;booking.discount_per_night=300000;booking.price_subtotal=6600000;booking.discount_total=600000;
 specials=[{special_price:'60000'}];
 const result=await extend({...input,amount_paid_now:'54000',payment_option:'full'},{name:'Reception'});
 assert.equal(result.additional,5400000);assert.equal(booking.price_subtotal,12600000);assert.equal(booking.discount_total,1200000);assert.equal(booking.amount,11400000);
});

test('one-time flat booking discount is not repeated for extended nights',async()=>{
 reset();booking.discount_scope='booking';booking.discount_type='flat';booking.discount_value=5000;booking.price_subtotal=6500000;booking.discount_total=500000;
 const result=await extend({...input,amount_paid_now:'50000',payment_option:'full'},{name:'Reception'});
 assert.equal(result.additional,5000000);assert.equal(result.total,11000000);assert.equal(booking.price_subtotal,11500000);assert.equal(booking.discount_total,500000);
});
