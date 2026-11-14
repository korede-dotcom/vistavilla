'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Op}=require('sequelize');
let bookings=[],rooms=[],logs=[];
const transaction={LOCK:{UPDATE:'UPDATE'}};
function matches(row,where){return Reflect.ownKeys(where).every(key=>{
 const expected=where[key],value=row[key];
 if(expected&&typeof expected==='object'&&!(expected instanceof Date))return Reflect.ownKeys(expected).every(op=>{
  const compare=expected[op];if(op===Op.in)return compare.includes(value);if(op===Op.ne)return value!==compare;
  if(op===Op.lte)return value<=compare;if(op===Op.lt)return value<compare;if(op===Op.gt)return value>compare;
  throw Error('Unsupported comparison');
 });return value===expected;
});}
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{transaction:async fn=>fn(transaction)});
stub('../models/HotelBooking',{findAll:async({where})=>bookings.filter(row=>matches(row,where)),findOne:async({where})=>bookings.find(row=>matches(row,where))});
stub('../models/RoomNumbers',{findOne:async({where})=>rooms.find(row=>matches(row,where))});
stub('../models/ActivityLog',{create:async(data,options)=>{assert.equal(options.transaction,transaction);logs.push(data);}});
const release=require('../services/releaseRooms'),stay=require('../utils/stayWindow');
function row(id,end,status='success',room_id=id){return {id,end:new Date(end),status,room_id,room_number:String(room_id),guest_name:'Guest '+id,reference_id:'BOOK'+id,amount:10000000,balance:status==='part-payment'?5000000:0,checked_in:true,checked_out:false,start:new Date('2026-11-12T12:00:00+01:00'),async update(data,options){assert.equal(options.transaction,transaction);Object.assign(this,data);}};}
function reset(rows){logs=[];bookings=rows;rooms=[1,2,3].map(_id=>({_id,status:true,room_number:String(_id),async update(data,options){assert.equal(options.transaction,transaction);Object.assign(this,data);}}));}
test('checkout releases exactly at 11:59 AM Lagos, marks checked out and is idempotent',async()=>{
 reset([row(1,'2026-11-14T12:00:00+01:00')]);
 assert.equal(await release(new Date('2026-11-14T11:58:59+01:00')),0);assert.equal(rooms[0].status,true);
 assert.equal(await release(new Date('2026-11-14T11:59:00+01:00')),1);assert.equal(rooms[0].status,false);assert.equal(bookings[0].checked_out,true);
 assert.equal(await release(new Date('2026-11-14T12:01:00+01:00')),0);assert.equal(logs.length,1);
});
test('missed prior-day checkouts and part-payment bookings are caught up without changing money',async()=>{
 reset([row(1,'2026-11-13T12:00:00+01:00','part-payment'),row(2,'2026-11-13T12:00:00+01:00','confirmed')]);
 assert.equal(await release(new Date('2026-11-14T08:00:00+01:00')),2);
 assert.equal(bookings[0].balance,5000000);assert.equal(bookings[0].amount,10000000);assert.equal(bookings[0].status,'part-payment');assert.ok(bookings.every(row=>row.checked_out));
});
test('another current occupant protects room status, while a future booking does not hold occupancy today',async()=>{
 reset([row(1,'2026-11-13T12:00:00+01:00'),row(2,'2026-11-16T12:00:00+01:00','success',1)]);
 await release(new Date('2026-11-14T12:00:00+01:00'));assert.equal(bookings[0].checked_out,true);assert.equal(rooms[0].status,true);
 reset([row(1,'2026-11-13T12:00:00+01:00'),row(2,'2026-11-16T12:00:00+01:00','success',1)]);bookings[1].checked_in=false;
 await release(new Date('2026-11-14T12:00:00+01:00'));assert.equal(rooms[0].status,false);
});
test('cancelled stays are not checked out by the scheduler and checkout uses Lagos calendar dates',async()=>{
 reset([row(1,'2026-11-13T12:00:00+01:00','cancelled')]);assert.equal(await release(new Date('2026-11-14T12:00:00+01:00')),0);
 assert.equal(stay.checkoutAt('2026-11-14T00:00:00+01:00').toISOString(),'2026-11-14T10:59:00.000Z');
});
test('scheduler catches up on startup, retries every minute with Lagos timezone and prevents overlapping runs',async()=>{
 let callback,schedule,options,calls=0,finish;
 const release=async()=>{calls++;if(calls>1)await new Promise(resolve=>{finish=resolve;});};
 await require('../config/checkoutScheduler')({schedule(expr,fn,opts){schedule=expr;callback=fn;options=opts;}},release);
 assert.equal(calls,1);assert.equal(schedule,'* * * * *');assert.equal(options.timezone,'Africa/Lagos');
 const running=callback();await callback();assert.equal(calls,2);finish();await running;
});
