'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {initial}=require('../utils/bookingEdit');
let booking,ledger,conflict,writes;
const tx={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
function record(name,data,options){assert.equal(options.transaction,tx);writes.push({name,data});return data;}
stub('../config/connectDB',{transaction:async fn=>fn(tx)});
stub('../models/HotelBooking',{findOne:async options=>options.where.reference_id?booking:conflict,update:async(data,options)=>{record('booking',data,options);Object.assign(booking,data);}});
stub('../models/RoomNumbers',{findOne:async()=>({_id:1,is_retained:false})});
stub('../models/PartPayment',{findOne:async()=>ledger,create:async(data,options)=>{record('ledger',data,options);return {...data,_id:9};}});
stub('../models/PaymentHistory',{create:async(data,options)=>record('payment',data,options)});
stub('../models/BookingRevision',{create:async(data,options)=>record('revision',data,options)});
const edit=require('../services/editBooking');
function reset(){writes=[];conflict=null;ledger=null;booking={id:7,reference_id:'BOOK',room_id:1,room_number:'101',room_name:'Suite',category_name:'Suite',category_id:10,
 start:new Date('2099-01-01T13:15:00Z'),end:new Date('2099-01-03T12:30:00Z'),updatedAt:new Date('2098-12-31T09:00:00Z'),night:2,
 amount:6000000,amount_paid:6000000,balance:0,status:'success',checked_in:true,checked_out:false,guest_name:'Guest',guest_email:'g@example.com',guest_phone:'08000000000',guest_address:'Lagos',guest_count:1,
 discount_scope:'booking',discount_type:'flat',discount_value:0,discount_per_night:0,price_subtotal:6000000,discount_total:0,caution_fee_amount:500000,
 get(){const {get,...data}=this;return data;}};}
function input(extra={}){return {...initial(booking),guest_name:'Updated Guest',guest_email:'g@example.com',guest_phone:'08000000000',guest_address:'Lagos',guest_count:'1',reason:'Guest requested change',amount_paid_now:'0',payment_method:'cash',...extra};}
const staff={_id:'staff-1',name:'Reception'};
test('editing dates and flat discount recalculates totals and synchronizes ledger, receipt and revision',async()=>{
 reset();const data=input({end:'2099-01-04',discount_value:'5000',amount_paid_now:'10000'});
 const preview=await edit('BOOK',data,staff,true);assert.equal(preview.total,8500000);assert.equal(preview.balance,1500000);assert.equal(writes.length,0);
 await edit('BOOK',data,staff);
 assert.equal(booking.night,3);assert.equal(booking.amount,8500000);assert.equal(booking.amount_paid,7000000);assert.equal(booking.balance,1500000);assert.equal(booking.status,'part-payment');
 assert.equal(booking.end.toISOString(),'2099-01-04T12:30:00.000Z');assert.equal(booking.caution_fee_amount,500000);
 const saved=writes.find(w=>w.name==='ledger').data;assert.equal(saved.total_amount,8500000);assert.equal(saved.guest_name,'Updated Guest');
 assert.equal(writes.find(w=>w.name==='payment').data.payment_amount,1000000);
 const revision=writes.find(w=>w.name==='revision').data;assert.equal(revision.before.total,6000000);assert.equal(revision.after.total,8500000);assert.equal(revision.edited_by,'Reception');assert.ok(revision.guest_fields_changed.includes('guest_name'));
});
test('lower price preserves receipts as guest credit and existing payment record is updated',async()=>{
 reset();ledger={_id:9,amount_paid:6000000,update:async(data,options)=>{record('updatedLedger',data,options);return {...data,_id:9};}};
 const result=await edit('BOOK',input({rate:'20000',discount_type:'percentage',discount_value:'10'}),staff);
 assert.equal(result.total,3600000);assert.equal(result.credit,2400000);assert.equal(booking.balance,0);assert.equal(booking.amount_paid,6000000);
 assert.ok(writes.some(w=>w.name==='updatedLedger'));assert.ok(!writes.some(w=>w.name==='ledger'));assert.ok(!writes.some(w=>w.name==='payment'));
});
test('guest-only edit retains precise mixed-rate totals and does not fabricate payment receipts',async()=>{
 reset();booking.amount=6000001;booking.amount_paid=6000001;booking.price_subtotal=6000001;
 await edit('BOOK',input(),staff);assert.equal(booking.amount,6000001);assert.ok(!writes.some(w=>w.name==='payment'));
});
test('stale edits, overlaps, overpayments and checked-out bookings reject before writes',async()=>{
 reset();await assert.rejects(edit('BOOK',input({expected_version:'stale'}),staff),/changed/);assert.equal(writes.length,0);
 reset();conflict={id:8};await assert.rejects(edit('BOOK',input(),staff),/overlap/);assert.equal(writes.length,0);
 reset();await assert.rejects(edit('BOOK',input({amount_paid_now:'1'}),staff),/exceeds/);assert.equal(writes.length,0);
 reset();booking.checked_out=true;await assert.rejects(edit('BOOK',input(),staff),/active/);
 reset();await assert.rejects(edit('BOOK',input({discount_value:'999999'}),staff),/Discount/);
 reset();await assert.rejects(edit('BOOK',input({reason:''}),staff),/reason/);
});
