'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const filename=require.resolve('../models/PartPayment');let ledger={amount_paid:5000000};
require.cache[filename]={id:filename,filename,loaded:true,exports:{findOne:async()=>ledger}};
const snapshot=require('../services/receiptBooking');
test('receipt generation reads the actual ledger instead of claiming the whole booking amount was paid',async()=>{
 const original={reference_id:'BOOK',amount:10000000,amount_paid:10000000,balance:0,status:'success'};
 const result=await snapshot(original);assert.equal(result.amount_paid,5000000);assert.equal(result.balance,5000000);assert.equal(result.receipt_has_ledger,true);
 assert.equal(original.amount_paid,10000000);
 ledger=null;assert.deepEqual(await snapshot(original),original);
});
