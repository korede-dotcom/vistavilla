'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Op}=require('sequelize'),stay=require('../utils/stayWindow');
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
let bookings=[];
stub('../models/HotelBooking',{findAll:async({where})=>bookings.filter(row=>where.status[Op.in].includes(row.status)&&!row.checked_out&&row.start<where.start[Op.lt]&&row.end>where.end[Op.gt])});
stub('../models/RoomNumbers',{findAll:async()=>[{_id:1,room_number:'01'},{_id:2,room_number:'02'}]});
const available=require('../services/bookingAvailability');
test('checkout-day arrivals are allowed, but partial, confirmed and fully-contained overlaps block the room',async()=>{
 bookings=[{room_id:1,status:'success',checked_out:false,start:new Date('2026-11-12T12:00:00+01:00'),end:new Date('2026-11-14T12:00:00+01:00')}];
 assert.equal((await available(1,stay.windowFor('14-11-2026','16-11-2026'))).availableRooms,2);
 for(const status of ['success','part-payment','confirmed','completed']){
  bookings[0]={...bookings[0],status,end:new Date('2026-11-17T12:00:00+01:00')};
  const result=await available(1,stay.windowFor('14-11-2026','16-11-2026'));assert.equal(result.availableRooms,1);assert.equal(result.availableRoomDetails[0]._id,2);
 }
});
test('abandoned and cancelled requests do not reserve rooms; invalid dates reject',async()=>{
 bookings=['initiated','pending','cancelled'].map(status=>({room_id:1,status,checked_out:false,start:new Date('2026-11-12T12:00:00+01:00'),end:new Date('2026-11-17T12:00:00+01:00')}));
 assert.equal((await available(1,stay.windowFor('14-11-2026','16-11-2026'))).availableRooms,2);
 assert.throws(()=>stay.windowFor('31-11-2026','02-12-2026'));assert.throws(()=>stay.windowFor('14-11-2026','14-11-2026'));
});
