'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
let role='hotel receptionist',saved,active=0;
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
process.env.JWT_SECRET='test';
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'staff'};next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
const room={_id:1,room_name:'Suite',room_number:'101',category_id:2,update:async data=>{saved=data;}};
stub('../models/RoomNumbers',{findByPk:async()=>room,sequelize:{transaction:async fn=>fn({LOCK:{UPDATE:'UPDATE'}})}});
stub('../models/Room',{findByPk:async id=>({_id:Number(id)}),findAll:async()=>[{_id:2,category_name:'Two bed'}]});
stub('../models/HotelBooking',{count:async()=>active});
stub('../services/publicPhotos',{invalidate(){}});
const router=require('../routes/RoomEditor');
function request(method,body={}){return new Promise((resolve,reject)=>{
 const req={method,url:'/1',body,headers:{},cookies:{jwtToken:'session'}};
 const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},json(data){resolve({...data,status:this.statusCode});}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
test('hotel staff can load and save individual room details, while forged writes are rejected',async()=>{
 for(const allowed of ['ceo','hotelmanager','hotel receptionist']) {
  role=allowed;const page=await request('GET');assert.equal(page.data.room._id,1);
  saved=undefined;
  assert.equal((await request('PATCH',{room_name:'New name',room_number:'102',category_id:2})).status,403);
  assert.equal(saved,undefined);
  assert.equal((await request('PATCH',{csrf:page.data.csrf,room_name:'New name',room_number:'102',category_id:2,status:false})).status,200);
  assert.deepEqual(saved,{room_name:'New name',room_number:'102',category_id:2});
 }
 role='bar manager';assert.equal((await request('GET')).status,403);
});
test('category changes with active bookings are blocked; empty fields cannot be saved',async()=>{
 role='ceo';const page=await request('GET');const input={csrf:page.data.csrf,room_name:'Room',room_number:'102',category_id:3};
 saved=undefined;active=1;
 assert.equal((await request('PATCH',input)).status,400);assert.equal(saved,undefined);
 active=0;assert.equal((await request('PATCH',input)).status,200);
 assert.equal((await request('PATCH',{...input,room_name:' '})).status,400);
});
test('room list compiles with the shared details and photo modal',()=>{
 const source=fs.readFileSync('views/portal/all-rooms.ejs','utf8');
 ejs.compile(source);
 assert.ok(source.includes('id="roomDetailsForm"'));assert.ok(source.includes('id="imageGallery"'));
 assert.ok(!source.includes('edit-room.html'));
});
