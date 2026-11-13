'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
let writes=[],balance=4000000,role='hotel receptionist';
const transaction={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
function save(kind,data,options){assert.equal(options.transaction,transaction);writes.push({kind,data});}
stub('../config/connectDB',{transaction:async fn=>{try{return await fn(transaction);}catch(error){writes=[];throw error;}}});
stub('../models/HotelBooking',{
 findOne:async()=>({id:1,reference_id:'BOOK',amount:10000000,balance,discount_total:1000000}),
 update:async(data,options)=>save('booking',data,options)
});
stub('../models/PartPayment',{findOne:async()=>({_id:2,reference_id:'BOOK',guest_name:'Ada',room_number:'101',balance,amount_paid:6000000,total_amount:10000000,payment_status:balance?'partial':'completed',update:async(data,options)=>save('part',data,options)})});
stub('../models/BalanceClearance',{create:async(data,options)=>save('clearance',data,options)});
stub('../models/ActivityLog',{create:async(data,options)=>save('log',data,options)});
const clear=require('../services/clearBalance');
const staff={_id:'staff',name:'Reception',roleName:'hotel receptionist'};
test('waiving a balance reduces the booking total, retains actual money received and records reason and staff',async()=>{
 await clear(2,'Manager approved goodwill waiver',staff);
 const booking=writes.find(row=>row.kind==='booking').data;
 assert.equal(booking.amount,6000000);assert.equal(booking.amount_paid,6000000);assert.equal(booking.balance,0);
 assert.equal(booking.discount_total,5000000);assert.equal(booking.price_subtotal,11000000);
 const part=writes.find(row=>row.kind==='part').data;
 assert.equal(part.total_amount,6000000);assert.equal(part.balance,0);assert.equal(part.amount_paid,undefined);
 const audit=writes.find(row=>row.kind==='clearance').data;
 assert.equal(audit.amount,4000000);assert.equal(audit.cleared_by,'staff');assert.match(audit.reason,/goodwill/);
 assert.match(writes.find(row=>row.kind==='log').data.description,/No money received/);
});
test('a reason is required and settled balances cannot be cleared again',async()=>{
 writes=[];await assert.rejects(clear(2,'',staff),/reason/);assert.equal(writes.length,0);
 balance=0;await assert.rejects(clear(2,'Approved waiver',staff),/already settled/);assert.equal(writes.length,0);balance=4000000;
});
process.env.JWT_SECRET='test';
stub('../middleware/checkAuthCookie',(req,res,next)=>{req.user=staff;next();});
stub('../models/User',{findByPk:async()=>({roleName:role})});
const router=require('../routes/BalanceClearance');
function request(method,url='/',body={}){return new Promise((resolve,reject)=>{
 const req={method,url,body,headers:{},cookies:{jwtToken:'session'}};
 const res={statusCode:200,set(){},status(code){this.statusCode=code;return this;},json(data){resolve({http:this.statusCode,data});}};
 router.handle(req,res,error=>reject(error||Error('No response')));
});}
test('hotel staff can clear balances with a valid token and other roles are denied',async()=>{
 for(const allowed of ['ceo','hotelmanager','hotel receptionist']){
  role=allowed;const page=await request('GET');assert.equal(page.http,200);
  assert.equal((await request('POST','/2',{reason:'Approved waiver'})).http,403);
  assert.equal((await request('POST','/2',{csrf:page.data.csrf,reason:'Approved waiver'})).http,200);
 }
 role='bar manager';assert.equal((await request('GET')).http,403);
 ejs.compile(fs.readFileSync('views/portal/part-payments.ejs','utf8'));
});
