'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
let hooks;
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{define(name,attributes,options){hooks=options.hooks;return {};}});
require('../models/HotelBooking');
const stay=require('../utils/stayWindow');
test('booking save fixes checkout to Lagos noon without adding server-local offsets',()=>{
 const booking={end:new Date('2026-11-14T14:00:00+01:00'),isNewRecord:true};
 hooks.beforeSave(booking);assert.equal(booking.end.toISOString(),'2026-11-14T11:00:00.000Z');
 const existing={end:new Date('2026-11-14T13:00:00+01:00'),changed:()=>false};const original=existing.end;
 hooks.beforeSave(existing);assert.equal(existing.end,original);
});
let candidates=[];
stub('../models/HotelBooking',{findAll:async()=>candidates});
const conflict=require('../services/findBookingConflict');
test('a legacy stay ending on Nov 14 does not block a new Nov 14 arrival even if its stored time drifted',async()=>{
 const window=stay.windowFor('2026-11-14','2026-11-15');
 candidates=[{reference_id:'OLD',start:new Date('2026-11-13T00:00:00Z'),end:new Date('2026-11-14T14:00:00+01:00'),amount:20000000}];
 assert.equal(await conflict({room_number:'03'},window),null);
 assert.equal(candidates[0].amount,20000000);
 candidates.push({reference_id:'ACTIVE',start:new Date('2026-11-14T12:00:00+01:00'),end:new Date('2026-11-16T12:00:00+01:00')});
 assert.equal((await conflict({room_number:'03'},window)).reference_id,'ACTIVE');
});
