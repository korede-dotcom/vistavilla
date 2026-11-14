'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs');
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../models/HotelBooking',{count:async options=>{assert.equal(options,undefined);return 7;}});
stub('../models/RoomNumbers',{count:async options=>{assert.equal(options,undefined);return 2;}});
const stats=require('../services/siteStats');
test('public counts use all bookings and individual rooms without availability or publication filters',async()=>{
 assert.deepEqual(await stats(),{totalBookings:7,totalRooms:2});
});
test('homepage refreshes incorrect totals to two rooms without animating them to zero, retaining values offline',async()=>{
 const room={dataset:{count:'0'},textContent:'0'},bookings={dataset:{count:'0'},textContent:'0'};
 let failed=false;
 const context={document:{querySelectorAll:selector=>selector.includes('totalRooms')?[room]:[bookings]},window:{addEventListener(){}},fetch:async(url,options)=>{
  assert.equal(url,'/api/site-stats');assert.equal(options.cache,'no-store');
  if(failed)throw Error('offline');return {ok:true,json:async()=>({status:true,data:{totalRooms:2,totalBookings:7}})};
 }};
 vm.createContext(context);vm.runInContext(fs.readFileSync('views/js/site-stats.js','utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(room.textContent,'2');assert.equal(bookings.textContent,'7');
 failed=true;await context.refreshSiteStats();assert.equal(room.textContent,'2');
});
