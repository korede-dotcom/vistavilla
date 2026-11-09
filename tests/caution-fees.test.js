'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {amountInKobo,nextStatus}=require('../utils/cautionFee');
test('caution fee conversion is separate integer money with strict validation',()=>{
 assert.equal(amountInKobo('25000.50'),2500050);assert.equal(amountInKobo(),0);
 for(const value of [-1,'NaN','1.001',Infinity,{},''])assert.throws(()=>amountInKobo(value));
});
test('refund is final and a held fee can later be refunded',()=>{
 assert.equal(nextStatus('paid','hold'),'hold');assert.equal(nextStatus('hold','refund'),'refunded');
 for(const action of ['hold','refund'])assert.throws(()=>nextStatus('refunded',action));
 assert.throws(()=>nextStatus('none','refund'));assert.throws(()=>nextStatus('hold','hold'));
});
const row={id:1,caution_fee_amount:500000,caution_fee_status:'paid'};
const tx={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{transaction:async fn=>fn(tx)});
let updates=0;
stub('../models/HotelBooking',{
 findOne:async options=>{assert.equal(options.lock,'UPDATE');return options.where.reference_id==='MISSING'?null:row;},
 findByPk:async(id,options)=>{assert.equal(options.lock,'UPDATE');return row;},
 update:async(data,options)=>{assert.equal(options.transaction,tx);Object.assign(row,data);updates++;},
 sum:async(field,options)=>{
  const {Op}=require('sequelize');assert.deepEqual(options.where.caution_fee_status[Op.in],['paid','hold']);
  return row.caution_fee_status==='refunded'?0:row.caution_fee_amount;
 }
});
const fees=require('../services/cautionFees');
test('holding preserves current total, refund decrements once and records the staff member',async()=>{
 assert.equal(await fees.summary(),500000);
 await fees.changeStatus(1,'hold',{name:'Reception'});assert.equal(await fees.summary(),500000);
 await fees.changeStatus(1,'refund',{name:'Manager'});assert.equal(await fees.summary(),0);
 assert.equal(row.caution_fee_refunded_by,'Manager');assert.ok(row.caution_fee_refunded_at instanceof Date);
 await assert.rejects(fees.changeStatus(1,'refund',{name:'Manager'}));assert.equal(updates,2);assert.equal(await fees.summary(),0);
});

test('manual fee collection requires a booking and amount, creates only once and retains refund history',async()=>{
 row.caution_fee_amount=0;row.caution_fee_status='none';row.amount=10000000;updates=0;
 await assert.rejects(fees.collect('BOOK','0',{name:'Reception'}),/greater than zero/);
 await assert.rejects(fees.collect('MISSING','25000',{name:'Reception'}),/not found/);
 await fees.collect('BOOK','25000',{name:'Reception'});
 assert.equal(row.caution_fee_amount,2500000);assert.equal(row.caution_fee_status,'paid');assert.equal(row.caution_fee_collected_by,'Reception');assert.equal(row.amount,10000000);
 assert.equal(await fees.summary(),2500000);
 await assert.rejects(fees.collect('BOOK','25000',{name:'Reception'}),/already exists/);
 await fees.changeStatus(1,'refund',{name:'Manager'});assert.equal(await fees.summary(),0);
 await assert.rejects(fees.collect('BOOK','25000',{name:'Reception'}),/already exists/);
});
test('booking requests cannot create caution fees through legacy or forged deposit fields',()=>{
 const clean=require('../utils/cautionFee').withoutBookingFee({guest_name:'Guest',amount:100,caution_fee:'25000',caution_fee_amount:2500000,caution_fee_status:'paid',caution_fee_collected_by:'Staff'});
 assert.deepEqual(clean,{guest_name:'Guest',amount:100});
 const fs=require('fs');const template=fs.readFileSync('views/portal/add-booking-category.ejs','utf8');
 assert.ok(!template.includes('id="caution_fee"'));assert.ok(!template.includes("fetch('/portal/caution-fees/default'"));
});
