'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),ejs=require('ejs'),fs=require('fs'),path=require('path');
const filename=require.resolve('../services/publicPhotos');
require.cache[filename]={id:filename,filename,loaded:true,exports:{attachCategories:async rows=>rows,roomPhotos:async()=>[]}};
const details=require('../services/roomDetails');
const category={_id:2,category_name:'Suite',price:50000,picture:[]};
test('room details normalize the actual Sequelize roomcategory association and always supply photos',async()=>{
 const room=await details({get:()=>({_id:1,room_name:'Room one',room_number:'01',roomcategory:category})});
 assert.deepEqual(room.roomImages,[]);assert.equal(room.roomcategory.category_name,'Suite');assert.equal(room.roomcategory.hasSpecialPrice,false);
 const legacy=await details({_id:1,Room:category},{special_price:'40000',end_date:'2026-12-01'});
 assert.equal(legacy.roomcategory.price,40000);assert.equal(legacy.roomcategory.originalPrice,50000);
 assert.equal(await details(null),null);assert.equal(await details({_id:1}),null);
});
test('booking page renders without uploaded room images and still offers WhatsApp booking',()=>{
 const file=path.resolve('views/room-details.ejs');
 const source=fs.readFileSync(file,'utf8').replace(/<%- include\([^\n]*%>/g,'');
 const html=ejs.render(source,{selectedRoomNumber:{_id:1,room_name:'Room one',room_number:'01',roomcategory:category},totalRooms:[],start:'15-11-2026',end:'17-11-2026',activeMarquees:null},{filename:file});
 assert.ok(html.includes('/images/most-rated.jpg'));assert.ok(html.includes('Book via WhatsApp'));
 assert.ok(!html.includes('undefined'));
});

test('category images are used when the selected room has no photos, with working room-switch links',()=>{
 const file=path.resolve('views/room-details.ejs');const source=fs.readFileSync(file,'utf8').replace(/<%- include\([^\n]*%>/g,'');
 const picture='https://res.cloudinary.com/villa/image/upload/images/category-suite.jpg';
 const html=ejs.render(source,{selectedRoomNumber:{_id:2,category_id:2,room_name:'Room two',room_number:'02',roomImages:[],roomcategory:{...category,picture:[picture]}},totalRooms:[{_id:1,room_number:'01'},{_id:2,room_number:'02'}],start:'15-11-2026',end:'17-11-2026',activeMarquees:null},{filename:file});
 assert.ok(html.includes('src="'+picture+'"'));assert.ok(!html.includes('/images/most-rated.jpg'));
 assert.ok(html.includes('room_id=2'));assert.ok(html.includes('room_id=1'));assert.ok(html.includes('aria-current="page"'));
});
test('explicit room selection is respected and unknown IDs do not silently select the first room',()=>{
 const select=require('../utils/selectAvailableRoom');const rooms=[{_id:1,room_number:'01'},{_id:2,room_number:'02'}];
 assert.equal(select(rooms,'2').room_number,'02');assert.equal(select(rooms,'99'),null);
 assert.equal(select(rooms,undefined,['02','01'])._id,2);
});
test('each search result links to its exact room with category, room choices and dates preserved',()=>{
 const vm=require('vm');const source=fs.readFileSync('views/index.ejs','utf8');
 const script=source.slice(source.indexOf('function ensureSearchActions('),source.indexOf('function showErrorModal('));
 function element(){return {children:[],style:{},setAttribute(name,value){this[name]=value;},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}};}
 const nodes={};const context={URLSearchParams,window:{location:{}},document:{getElementById:id=>nodes[id]||(nodes[id]=element()),createElement:()=>element()},openSearchModal(){}};
 vm.createContext(context);vm.runInContext(script,context);
 context.showSuccessModal({data:{category_id:2,availableRoomDetails:[{_id:1,room_number:'01'},{_id:2,room_number:'02'}]}},{start:'15-11-2026',end:'17-11-2026'});
 const second=nodes.modalBody.children[0].children[1];const url=new URL(second.href,'https://example.com');
 assert.equal(url.searchParams.get('room_id'),'2');assert.equal(url.searchParams.get('data'),'01,02');assert.equal(url.searchParams.get('start'),'15-11-2026');
});
