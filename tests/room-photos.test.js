'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
function stub(name, exports) {
 const filename = require.resolve(name);
 require.cache[filename] = {id:filename, filename, loaded:true, exports};
}
process.env.GALLERY_FOLDER = 'images';
const url = id => 'https://res.cloudinary.com/villa/image/upload/v1/' + id + '.jpg';
const records = [
 { _id:1, room_id:11, public_id:'images/rooms/11/front', url:url('images/rooms/11/front') },
 { _id:2, room_id:12, public_id:'images/rooms/12/front', url:url('images/rooms/12/front') },
 { _id:3, room_id:11, public_id:'ids/customer', url:url('ids/customer') },
 { _id:4, room_id:11, public_id:'damages/window', url:url('damages/window') },
 { _id:5, room_id:11, public_id:'wishmewell/old', url:url('wishmewell/old') }
];
let resourceCalls = 0, created, deleted, role = 'hotel receptionist', uploadFolder;
const model = {
 findAll: async () => records,
 bulkCreate: async rows => {created=rows;return rows;},
 findOne: async ({where}) => records.find(row=>row._id===where._id&&row.room_id===where.room_id)
};
stub('../models/Images', model);
stub('../models/RoomNumbers', {
 findAll:async()=>[{_id:11,category_id:1},{_id:12,category_id:2}],
 findByPk:async id=> Number(id)===11 ? {_id:11} : null
});
stub('cloudinary', {v2:{api:{resources:async options=>{
 resourceCalls++;assert.equal(options.prefix,'images/');
 return {resources:[{public_id:'images/pool',secure_url:url('images/pool')},{public_id:'damages/broken',secure_url:url('damages/broken')}]};
}}}});
const policy = require('../utils/publicPhoto');
const photos = require('../services/publicPhotos');
test('public photos allow gallery folder only and reject private folders and unsafe URLs',()=>{
 for(const id of ['ids/customer','damages/window','wishmewell/old','images/ids/customer','images/damages/window']) {
  assert.equal(policy.allowedId(id),false);assert.equal(policy.allowedUrl(url(id)),false);
 }
 assert.equal(policy.allowedId('images/rooms/11/front'),true);
 assert.equal(policy.allowedUrl(url('images/rooms/11/front')),true);
 assert.equal(policy.allowedUrl('javascript:alert(1)'),false);
 assert.equal(policy.allowedUrl('https://other.example/images/test.jpg'),false);
});
test('availability associates photos with each exact room; categories exclude old and private photos',async()=>{
 const rooms=await photos.attachRooms([{_id:11},{_id:12}]);
 assert.deepEqual(rooms[0].roomImages,[url('images/rooms/11/front')]);
 assert.deepEqual(rooms[1].roomImages,[url('images/rooms/12/front')]);
 const categories=await photos.attachCategories([{_id:1,picture:[url('ids/customer'),url('wishmewell/old'),url('images/lobby')]}]);
 assert.deepEqual(categories[0].picture,[url('images/rooms/11/front'),url('images/lobby')]);
});
test('public gallery combines approved room photos and folder images, then caches results',async()=>{
 const gallery=await photos.gallery();
 assert.deepEqual(gallery.map(photo=>photo.public_id),['images/rooms/11/front','images/rooms/12/front','images/pool']);
 await photos.gallery();assert.equal(resourceCalls,1);
});
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'staff'};next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
stub('../repos/cloudinary',{
 createParser:folder=>(req,res,next)=>{uploadFolder=folder(req);req.files=[{filename:uploadFolder+'/new',path:url(uploadFolder+'/new')}];next();},
 delete:async id=>{deleted=id;}
});
const router=require('../routes/RoomImages');
function request(method, query={room_id:'11'}, body={}) {
 return new Promise((resolve,reject)=>{
  const req={method,url:'/',query,body,headers:{}};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(data){resolve({status:this.statusCode,data});}};
  router.handle(req,res,error=>reject(error||Error('No response')));
 });
}
test('staff upload room photos once into the assigned room gallery folder',async()=>{
 for(const allowed of ['hotel receptionist','hotelmanager','ceo']) {
  role=allowed;const result=await request('POST');assert.equal(result.status,200);
  assert.equal(uploadFolder,'images/rooms/11');assert.equal(created[0].room_id,11);
  assert.equal(created[0].user_id,'staff');assert.equal(created[0].status,true);
  assert.equal(created[0].url,url('images/rooms/11/new'));
 }
 role='bar manager';assert.equal((await request('POST')).status,403);
 role='ceo';assert.equal((await request('POST',{room_id:'999'})).status,404);
 assert.equal((await request('GET',{},undefined)).status,400);
 assert.equal((await request('DELETE',{room_id:'11'},{image_id:2})).status,404);
 assert.equal(deleted,undefined);
});
