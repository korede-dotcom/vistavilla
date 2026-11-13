'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
let writes=[],conflict=null,checkedIn=true,retained=false;
const transaction={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
const end=new Date(Date.now()+86400000*3),start=new Date(Date.now()-86400000);
function bookings(){return [
 {id:1,reference_id:'A',room_id:11,room_number:'101',guest_name:'Ada',room_name:'One',category_id:5,category_name:'One bed',checked_in:checkedIn,checked_out:false,status:'part-payment',start,end,amount:9000000,balance:2000000},
 {id:2,reference_id:'B',room_id:12,room_number:'102',guest_name:'Ben',room_name:'Two',category_id:6,category_name:'Two bed',checked_in:true,checked_out:false,status:'success',start,end,amount:12000000,balance:0}
];}
function record(kind,data,options){assert.equal(options.transaction,transaction);writes.push({kind,data,where:options.where});}
stub('../config/connectDB',{transaction:async fn=>{try{return await fn(transaction);}catch(error){writes=[];throw error;}}});
stub('../models/HotelBooking',{findAll:async()=>bookings(),findOne:async()=>conflict,update:async(data,options)=>record('booking',data,options)});
stub('../models/RoomNumbers',{findAll:async()=>[{_id:11,room_number:'101',room_name:'One',category_id:5},{_id:12,room_number:'102',room_name:'Two',category_id:6,is_retained:retained}]});
stub('../models/Room',{findOne:async({where})=>({category_name:where._id===5?'One bed':'Two bed'})});
stub('../models/PartPayment',{update:async(data,options)=>record('part',data,options)});
stub('../models/RoomTransfer',{create:async(data,options)=>record('transfer',data,options)});
stub('../models/ActivityLog',{create:async(data,options)=>record('log',data,options)});
const exchange=require('../services/exchangeRooms');
const input={reference_id:'A',room_id:11,other_reference:'B',other_room_id:12},staff={_id:'manager',name:'Manager',roleName:'hotelmanager'};
test('exchange swaps both assignments and outstanding-ledger metadata without changing finances',async()=>{
 await exchange(input,staff);
 const updated=writes.filter(row=>row.kind==='booking');assert.equal(updated.length,2);
 assert.equal(updated[0].data.room_id,12);assert.equal(updated[1].data.room_id,11);
 for(const row of updated){assert.equal(row.data.amount,undefined);assert.equal(row.data.balance,undefined);assert.equal(row.data.status,undefined);}
 const transfers=writes.filter(row=>row.kind==='transfer');assert.equal(transfers.length,2);
 assert.equal(transfers[0].data.new_total,9000000);assert.equal(transfers[0].data.price_adjustment,0);assert.equal(transfers[0].data.amount_paid_now,0);
 assert.match(writes.find(row=>row.kind==='log').data.description,/Ada.*Ben/);
 assert.equal(writes.filter(row=>row.kind==='part').length,2);
});
test('stale, retained, overlapping and not-checked-in exchanges make no changes',async()=>{
 writes=[];await assert.rejects(exchange({...input,other_room_id:99},staff),/moved/);assert.equal(writes.length,0);
 retained=true;await assert.rejects(exchange(input,staff),/retained/);assert.equal(writes.length,0);retained=false;
 conflict={id:3};await assert.rejects(exchange(input,staff),/another booking/);assert.equal(writes.length,0);conflict=null;
 checkedIn=false;await assert.rejects(exchange(input,staff),/checked in/);assert.equal(writes.length,0);checkedIn=true;
});
let role='hotelmanager';
process.env.JWT_SECRET='test';
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user={_id:'manager'};next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
const router=require('../routes/RoomExchange');
function request(method,body={}){return new Promise((resolve,reject)=>{
 const req={method,url:'/',query:{},body,headers:{},cookies:{jwtToken:'session'}};
 const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},json(data){resolve({http:this.statusCode,data});}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
test('exchange allows hotel staff and rejects other roles and forged writes',async()=>{
 for(const allowed of ['hotelmanager','ceo','hotel receptionist']){role=allowed;assert.equal((await request('GET')).http,200);assert.equal((await request('POST',input)).http,403);}
 role='bar manager';assert.equal((await request('GET')).http,403);assert.equal((await request('POST',input)).http,403);
 ejs.compile(fs.readFileSync('views/portal/check-in.ejs','utf8'));
});
