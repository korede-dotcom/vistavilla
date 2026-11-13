'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
let role='hotel receptionist',saved;
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
process.env.JWT_SECRET='test';
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'staff'};next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
stub('../models/Room',{findOne:async()=>({_id:2,category_name:'Two bed',picture:['https://res.cloudinary.com/villa/image/upload/images/old.jpg'],update:async data=>{saved=data;}})});
stub('../services/publicPhotos',{invalidate(){}});
stub('../repos/cloudinary',{createParser:folder=>(req,res,next)=>{assert.equal(folder,'images/categories/2');req.files=[{path:'https://res.cloudinary.com/villa/image/upload/images/categories/2/new.jpg'}];next();}});
const router=require('../routes/CategoryEditor');
function request(method,body={},url='/2',headers={}){return new Promise((resolve,reject)=>{
 const req={method,url,body,headers,get(name){return headers[name];},cookies:{jwtToken:'session'}};
 const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},json(data){resolve({data,http:this.statusCode});}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
const valid={category_name:'Two bed',room_type:'Apartment',food:'No meals',cancellations_fee:'',description:'Spacious apartment',price:'100000.50',num_beds:'2',number_of_guests:'4',has_ac:true,has_wifi:true,status:true};
test('hotel staff can edit category details; writes require the session token and ignore unrelated fields',async()=>{
 for(const allowed of ['ceo','hotelmanager','hotel receptionist']) {
  role=allowed;const page=await request('GET');assert.equal(page.http,200);
  saved=undefined;assert.equal((await request('PATCH',valid)).http,403);assert.equal(saved,undefined);
  assert.equal((await request('PATCH',{...valid,csrf:page.data.data.csrf,service_id:99,picture:['forged']})).http,200);
  assert.deepEqual(saved,{...valid,num_beds:2,number_of_guests:4});
 }
 role='bar manager';assert.equal((await request('GET')).http,403);
});
test('category editor rejects invalid money, capacity and boolean inputs',async()=>{
 role='ceo';const page=await request('GET');const body={...valid,csrf:page.data.data.csrf};
 for(const invalid of [{price:'-1'},{price:'12.345'},{num_beds:'0'},{number_of_guests:'1.5'},{category_name:' '},{has_ac:'false'}]) {
  saved=undefined;assert.equal((await request('PATCH',{...body,...invalid})).http,400);assert.equal(saved,undefined);
 }
});
test('category list opens an edit modal and renders its form',()=>{
 const template=fs.readFileSync('views/portal/roomcategory.ejs','utf8');ejs.compile(template);
 assert.ok(template.includes('openCategoryEditor(<%= result._id %>)'));
 assert.ok(template.includes('id="categoryEditorForm"'));assert.ok(template.includes('/js/category-editor.js'));
});

test('manager photo changes require session authorization, retain existing photos and are scoped to the category',async()=>{
 role='hotelmanager';const page=await request('GET');const headers={'X-CSRF-Token':page.data.data.csrf};
 saved=undefined;assert.equal((await request('POST',{},'/2/photos')).http,403);assert.equal(saved,undefined);
 let result=await request('POST',{},'/2/photos',headers);assert.equal(result.http,200);
 assert.equal(saved.picture.length,2);assert.ok(saved.picture[1].includes('images/categories/2/'));
 result=await request('DELETE',{url:'https://other.example/photo'},'/2/photos',headers);assert.equal(result.http,404);
 result=await request('DELETE',{url:'https://res.cloudinary.com/villa/image/upload/images/old.jpg'},'/2/photos',headers);assert.equal(result.http,200);assert.deepEqual(saved.picture,[]);
});
test('category name and thumbnail open the editor, and audit descriptions identify photo and price changes',()=>{
 const source=fs.readFileSync('views/portal/roomcategory.ejs','utf8');assert.ok(!source.includes('profile.html'));assert.ok(source.includes('categoryPhotoUpload'));
 const words=require('../utils/activityDescription');const description=words.description('update','roomcategory',{category_name:'Two bed'},['picture','price']);
 assert.match(description,/Two bed/);assert.match(description,/photos/);assert.match(description,/price/);
});
