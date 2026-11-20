'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

let writes=[];
const transaction={};
function stub(name,exports){
 const filename=require.resolve(name);
 require.cache[filename]={id:filename,filename,loaded:true,exports};
}
function save(kind,data,{transaction:activeTransaction}){
 assert.equal(activeTransaction,transaction);
 writes.push({kind,data});
 return {...data,id:1,_id:2};
}
const next=(req,res,done)=>done();
stub('../middleware/checkAuthCookie',next);
stub('../repos/cloudinary',{idsParser:next});
stub('../repos/PricingConfig-repo',{getPriceForCategory:async()=>({price:50000})});
stub('../models/Room',{findOne:async()=>({number_of_guests:2})});
stub('../models/RoomNumbers',{});
stub('../models/HotelBooking',{findAll:async()=>[],create:async(...args)=>save('booking',...args)});
stub('../models/PartPayment',{create:async(...args)=>save('ledger',...args)});
stub('../models/PaymentHistory',{create:async(...args)=>save('payment',...args)});
stub('../utils/sendEmail',()=>{});
stub('../services/withRoomReservation',async(category,room,window,record)=>{
 return record({_id:1,room_number:room,room_name:'Suite'},transaction);
});

const router=require('../routes/Paystack');
function book(fields={}){
 return new Promise((resolve,reject)=>{
  const req={method:'POST',url:'/paystack/initialize/reception',headers:{},user:{name:'Reception'},body:{
   start:'2099-01-01',end:'2099-01-02',category_id:'1',room_number:'101',mode:'Cash',
   discount_type:'percentage',discount_value:'10',guest_count:'4',extra_guest_charge:'5000.50',
   is_part_payment:'true',amount_paid:'100025',...fields
  }};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(data){resolve({http:this.statusCode,...data});}};
  router.handle(req,res,error=>reject(error||Error('No response')));
 });
}
test('reception records the selected guest count, extra charge and sub-50% payment',async()=>{
 writes=[];
 const result=await book();
 assert.equal(result.status,true);assert.equal(result.data.balance,49000.25);
 const [booking,ledger,payment]=writes.map(entry=>entry.data);
 assert.equal(booking.guest_count,4);assert.equal(booking.extra_guest_charge,500050);
 assert.equal(booking.price_subtotal,5000000);assert.equal(booking.discount_total,500000);
 assert.equal(booking.amount,5000050);assert.equal(booking.status,'part-payment');
 assert.equal(ledger.total_amount,booking.amount);assert.equal(ledger.balance,4900025);
 assert.equal(payment.payment_amount,100025);
});
test('a full amount settles the booking and excessive payments leave no records',async()=>{
 writes=[];
 const full=await book({amount_paid:'5000050'});
 assert.equal(full.data.balance,0);assert.equal(full.data.booking.status,'success');
 assert.deepEqual(writes.map(entry=>entry.kind),['booking']);
 writes=[];
 const overpaid=await book({amount_paid:'5000051'});
 assert.equal(overpaid.http,400);assert.equal(writes.length,0);
});
