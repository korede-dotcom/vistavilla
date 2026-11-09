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
