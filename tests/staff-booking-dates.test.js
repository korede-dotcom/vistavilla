'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const dates=require('../utils/staffBookingDates');
const now=new Date('2026-11-09T14:00:00Z');
test('past stays require explicit permission and a reason',()=>{
 assert.throws(()=>dates({start:'2026-11-01',end:'2026-11-03',now}),/Record past dates/);
 assert.throws(()=>dates({start:'2026-11-01',end:'2026-11-03',allowPast:true,now}),/reason/);
 const result=dates({start:'2026-11-01',end:'2026-11-03',allowPast:true,reason:'Historical record',now});
 assert.equal(result.is_backdated,true);assert.equal(result.ended,true);assert.equal(result.active,false);
});
test('backdated check-in with future checkout is an active stay; future stays remain unoccupied',()=>{
 assert.equal(dates({start:'2026-11-08',end:'2026-11-12',allowPast:true,reason:'Late entry',now}).active,true);
 const future=dates({start:'2026-11-12',end:'2026-11-14',now});assert.equal(future.active,false);assert.equal(future.ended,false);assert.equal(future.is_backdated,false);
});
test('checkout order, calendar dates and Lagos date boundaries remain enforced',()=>{
 assert.throws(()=>dates({start:'2026-11-09',end:'2026-11-08',allowPast:true,reason:'Test',now}));
 assert.throws(()=>dates({start:'2026-02-30',end:'2026-03-04',allowPast:true,reason:'Test',now}));
 assert.throws(()=>dates({start:'2026-11-09',end:'2026-11-12',now:new Date('2026-11-09T23:30:00Z')}),/Record past dates/);
});
