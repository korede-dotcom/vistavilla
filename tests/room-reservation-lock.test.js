'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Op}=require('sequelize');
let releaseLock,queue=Promise.resolve(),booked=false,retained=false;
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{transaction:async fn=>{
 const tx={LOCK:{UPDATE:'UPDATE'}};try{return await fn(tx);}finally{if(tx.release)tx.release();}
}});
stub('../models/RoomNumbers',{findOne:async options=>{
 assert.equal(options.lock,'UPDATE');const previous=queue;queue=new Promise(resolve=>{releaseLock=resolve;});const unlock=releaseLock;
 await previous;options.transaction.release=unlock;return {_id:1,room_number:'01',is_retained:retained};
}});
stub('../models/HotelBooking',{findAll:async({where})=>{
 assert.ok(where[Op.or]);return booked?[{id:1,start:new Date('2026-11-14T12:00:00+01:00'),end:new Date('2026-11-16T12:00:00+01:00')}]:[];
}});
const reserve=require('../services/withRoomReservation'),window=require('../utils/stayWindow').windowFor('14-11-2026','16-11-2026');
test('simultaneous reservations lock the same room and recheck availability before saving',async()=>{
 const save=async(room,transaction)=>{assert.equal(room._id,1);assert.ok(transaction);await new Promise(resolve=>setImmediate(resolve));booked=true;return {id:1};};
 const results=await Promise.allSettled([reserve(1,'01',window,save),reserve(1,'01',window,save)]);
 assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
 assert.match(results.find(row=>row.status==='rejected').reason.message,/just been booked/);
});
test('retained rooms cannot be reserved',async()=>{
 booked=false;retained=true;let saved=false;
 await assert.rejects(reserve(1,'01',window,async()=>{saved=true;}),/retained/);assert.equal(saved,false);
});
