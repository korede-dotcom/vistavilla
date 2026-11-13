'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Op}=require('sequelize');
const {windowFor,overlap,retained}=require('../utils/transferAvailability');
const now=new Date('2026-11-13T10:00:00Z');
const booking={id:10,room_id:1,start:'2026-11-10T12:00:00Z',end:'2026-11-16T12:00:00Z',status:'success'};
test('ongoing transfers check only the remaining stay; upcoming stays keep their start date',()=>{
 const window=windowFor(booking,now);assert.equal(window.start.toISOString(),now.toISOString());
 const where=overlap(booking,window);
 assert.equal(where.end[Op.gt].getTime(),now.getTime());assert.equal(where.id[Op.ne],10);
 assert.equal(windowFor({...booking,start:'2026-11-14T12:00:00Z'},now).start.toISOString(),'2026-11-14T12:00:00.000Z');
 assert.throws(()=>windowFor({...booking,end:'2026-11-12'},now),/remaining stay/);
 assert.equal(retained({is_retained:true,retained_from:'2026-11-01',retained_to:'2026-11-12'},window),false);
 assert.equal(retained({is_retained:true,retained_from:'2026-11-14',retained_to:'2026-11-15'},window),true);
 assert.equal(retained({is_retained:true},window),true);
});
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
let query;
const active={...booking,start:new Date(Date.now()-86400000),end:new Date(Date.now()+86400000*3)};
stub('../models/HotelBooking',{
 findOne:async()=>active,
 findAll:async options=>{query=options.where;return [{room_id:3}];}
});
stub('../models/RoomNumbers',{findAll:async()=>[
 {_id:1},
 {_id:2,status:true}, // A stale occupancy flag must not hide a free room.
 {_id:3,status:false}, // A real overlapping reservation must hide this room.
 {_id:4,is_retained:true},
 {_id:5,is_retained:true,retained_from:new Date(Date.now()-86400000*3),retained_to:new Date(Date.now()-86400000)}
]});
const list=require('../services/availableTransferRooms');
test('transfer list excludes current, conflicting and retained rooms while allowing stale occupancy and expired holds',async()=>{
 const rooms=await list('BOOK',20);
 assert.deepEqual(rooms.map(room=>room._id),[2,5]);
 assert.ok(query.end[Op.gt]>active.start);
 assert.equal(query.start[Op.lt].getTime(),active.end.getTime());
});
