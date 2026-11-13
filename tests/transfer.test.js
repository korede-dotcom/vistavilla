'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const calculate = require('../utils/transferPricing');
const base = { rate: 50000, nights: 2, oldTotal: 6000000, amountPaid: 0, bookingStatus: 'success', bookingBalance: 0 };
test('fully paid legacy booking retains original receipts and charges new rate', () => {
  assert.deepEqual(calculate(base), {total:10000000,previousPaid:6000000,paidNow:0,amountPaid:6000000,balance:4000000,credit:0,adjustment:4000000});
});
test('existing part payment preserves receipts, adds cash and balances correctly', () => {
  const result = calculate({...base, existingPartPayment:{amount_paid:'3000000'}, paidNow:'10000.50'});
  assert.equal(result.amountPaid,4000050);
  assert.equal(result.balance,5999950);
  assert.equal(calculate({...base,paidNow:'40000'}).balance,0);
});
test('invalid and excess payments reject while downgrades retain credit', () => {
  for (const paidNow of [-1,'NaN','1.001',null,[],Infinity,'40000.01']) assert.throws(() => calculate({...base,paidNow}));
  assert.equal(calculate({...base,rate:10000}).credit,4000000);
  assert.throws(() => calculate({...base,nights:0}));
});

let writes, conflict, booking, part, commits, rollbacks;
const transaction = { LOCK:{UPDATE:'UPDATE'} };
function stub(name,exports) { const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports}; }
function record(name,data,options) { assert.equal(options.transaction,transaction);writes.push({name,data});return data; }
stub('../config/connectDB',{transaction:async fn=>{try{const result=await fn(transaction);commits++;return result;}catch(e){rollbacks++;writes=[];throw e;}}});
stub('../models/HotelBooking',{
  findOne:async options=> options.where.reference_id ? booking : conflict,
  update:async(data,options)=>record('booking',data,options)
});
stub('../models/RoomNumbers',{
  findOne:async()=>({_id:2,room_number:'202',room_name:'Large suite',category_id:20,status:false,is_retained:false,update:async(data,options)=>record('newRoom',data,options)}),
  update:async(data,options)=>record('oldRoom',data,options)
});
stub('../models/Room',{findOne:async()=>({category_name:'Suite',price:'50000'})});
stub('../models/PricingConfig',{findOne:async()=>null});
stub('../models/PartPayment',{
  findOne:async()=>part,
  create:async(data,options)=>{record('ledger',data,options);return {...data,_id:9};}
});
stub('../models/PaymentHistory',{create:async(data,options)=>record('payment',data,options)});
stub('../models/RoomTransfer',{create:async(data,options)=>record('transfer',data,options)});
const transfer=require('../services/transferRoom');
function reset(){writes=[];conflict=null;part=null;commits=0;rollbacks=0;booking={id:7,reference_id:'BOOK1',room_id:1,room_number:'101',room_name:'Small room',category_id:10,category_name:'Standard',amount:6000000,amount_paid:0,balance:0,status:'success',night:2,guest_name:'Guest',guest_email:'g@example.com',guest_phone:'08000000000',start:new Date(),end:new Date(Date.now()+86400000*2),checked_in:true,checked_out:false};}
const input={reference_id:'BOOK1',old_room_id:1,new_room_id:2,amount_paid_now:'10000',new_room_number:'forged',new_category_name:'forged'};
test('transfer writes actual destination metadata, ledger flag, payment history and booking in one transaction',async()=>{
 reset();const result=await transfer(input,{name:'Reception'});
 assert.equal(result.balance,3000000);
 const ledger=writes.find(w=>w.name==='ledger').data;
 assert.equal(ledger.room_number,'202');assert.equal(ledger.previous_room_number,'101');assert.equal(ledger.is_room_transfer,true);
 assert.equal(ledger.amount_paid,7000000);assert.equal(ledger.payment_status,'partial');
 assert.equal(writes.find(w=>w.name==='booking').data.amount,10000000);
 assert.equal(writes.find(w=>w.name==='booking').data.status,'part-payment');
 assert.equal(writes.find(w=>w.name==='payment').data.payment_amount,1000000);
 assert.equal(writes.find(w=>w.name==='transfer').data.price_adjustment,4000000);
 assert.equal(commits,1);assert.equal(rollbacks,0);
});
test('quote has no writes, stale/overlapping transfers fail without financial changes',async()=>{
 reset();await transfer({...input,amount_paid_now:0},{name:'Reception'},true);assert.equal(writes.length,0);
 reset();await assert.rejects(transfer({...input,old_room_id:99},{name:'Reception'}),/already moved/);assert.equal(writes.length,0);assert.equal(rollbacks,1);
 reset();conflict={id:99};await assert.rejects(transfer(input,{name:'Reception'}),/overlapping/);assert.equal(writes.length,0);
});
test('transfer updates existing ledger instead of adding a duplicate, full payment completes booking',async()=>{
 reset();part={_id:9,amount_paid:3000000,update:async(data,options)=>{record('updatedLedger',data,options);return {...data,_id:9};}};
 await transfer({...input,amount_paid_now:'70000'},{name:'Reception'});
 assert.ok(!writes.some(w=>w.name==='ledger'));
 assert.equal(writes.find(w=>w.name==='updatedLedger').data.payment_status,'completed');
 assert.equal(writes.find(w=>w.name==='booking').data.status,'success');
 assert.equal(writes.find(w=>w.name==='payment').data.balance_after,0);
});

test('subsequent collections update the transfer ledger and booking together and reject overpayment', async()=>{
 reset();
 part={_id:9,booking_id:7,reference_id:'BOOK1',total_amount:10000000,amount_paid:7000000,balance:3000000,payment_status:'partial',guest_name:'Guest',room_number:'202',update:async(data,options)=>record('updatedLedger',data,options)};
 const repo=require('../repos/PartPayment-repo');
 const result=await repo.completePayment(9,'10000','Reception');
 assert.equal(result.paymentCompleted,false);
 assert.equal(writes.find(w=>w.name==='updatedLedger').data.amount_paid,8000000);
 assert.equal(writes.find(w=>w.name==='booking').data.balance,2000000);
 assert.equal(writes.find(w=>w.name==='payment').data.payment_amount,1000000);
 writes=[];
 await assert.rejects(repo.completePayment(9,'30000.01','Reception'),/exceeds/);
 assert.equal(writes.length,0);
});

test('downgrades retain the full amount paid and produce zero balance plus guest credit',()=>{
 const result=calculate({...base,rate:10000,paidNow:'0'});
 assert.equal(result.total,2000000);assert.equal(result.amountPaid,6000000);assert.equal(result.balance,0);assert.equal(result.credit,4000000);assert.equal(result.adjustment,-4000000);
 assert.throws(()=>calculate({...base,rate:10000,paidNow:'1'}),/exceeds/);
});

test('server performs a downgrade and preserves excess payment in the persisted ledger',async()=>{
 reset();booking.amount=14000000;
 const result=await transfer({...input,amount_paid_now:'0'},{name:'Reception'});
 assert.equal(result.total,10000000);assert.equal(result.credit,4000000);assert.equal(result.balance,0);
 const ledgerData=writes.find(w=>w.name==='ledger').data;
 assert.equal(ledgerData.amount_paid,14000000);assert.equal(ledgerData.total_amount,10000000);assert.equal(ledgerData.payment_status,'completed');
 assert.equal(writes.find(w=>w.name==='booking').data.amount_paid,14000000);
 assert.ok(!writes.some(w=>w.name==='payment'));
});

test('same-category move keeps the agreed discounted price and needs no new payment',async()=>{
 reset();booking.category_id=20;booking.discount_total=1000000;
 const quote=await transfer({...input,amount_paid_now:''},{name:'Reception'},true);
 assert.equal(quote.sameCategory,true);assert.equal(quote.total,6000000);assert.equal(quote.adjustment,0);assert.equal(quote.balance,0);
 const result=await transfer({...input,amount_paid_now:''},{name:'Reception'});
 assert.equal(result.paidNow,0);assert.equal(result.total,6000000);
 assert.ok(!writes.some(w=>w.name==='payment'));
 const saved=writes.find(w=>w.name==='booking').data;
 assert.equal(saved.room_id,2);assert.equal(saved.status,'success');
 assert.equal(saved.discount_total,undefined);assert.equal(saved.discount_value,undefined);
 assert.equal(writes.find(w=>w.name==='transfer').data.price_adjustment,0);
});
test('same-category move with an outstanding balance proceeds without payment and retains the debt',async()=>{
 reset();booking.category_id=20;booking.status='part-payment';booking.amount_paid=2000000;booking.balance=4000000;
 const result=await transfer({...input,amount_paid_now:'0'},{name:'Reception'});
 assert.equal(result.total,6000000);assert.equal(result.balance,4000000);assert.equal(result.amountPaid,2000000);
 assert.equal(writes.find(w=>w.name==='booking').data.status,'part-payment');
 assert.ok(!writes.some(w=>w.name==='payment'));
});


stub('../models/ActivityLog',{create:async(data,options)=>record('exchangeLog',data,options)});
test('manager free-room exchange retains the agreed price even across categories, with no payment and an audit entry',async()=>{
 reset();
 const result=await transfer({...input,amount_paid_now:0},{_id:'manager',name:'Manager',roleName:'hotelmanager'},false,{exchange:true});
 assert.equal(result.total,6000000);assert.equal(result.adjustment,0);assert.equal(result.balance,0);
 const saved=writes.find(row=>row.name==='booking').data;
 assert.equal(saved.room_id,2);assert.equal(saved.discount_total,undefined);
 assert.ok(!writes.some(row=>row.name==='payment'));
 assert.match(writes.find(row=>row.name==='exchangeLog').data.description,/available Room 202/);
 reset();conflict={id:99};await assert.rejects(transfer({...input,amount_paid_now:0},{name:'Manager'},false,{exchange:true}),/overlapping/);assert.equal(writes.length,0);
 reset();booking.checked_in=false;await assert.rejects(transfer({...input,amount_paid_now:0},{name:'Manager'},false,{exchange:true}),/checked in/);
});
