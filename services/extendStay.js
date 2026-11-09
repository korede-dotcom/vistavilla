'use strict';
const db=require('../config/connectDB');
const Booking=require('../models/HotelBooking');
const RoomNumber=require('../models/RoomNumbers');
const Room=require('../models/Room');
const Pricing=require('../models/PricingConfig');
const Part=require('../models/PartPayment');
const History=require('../models/PaymentHistory');
const Extension=require('../models/StayExtension');
const {Op}=require('sequelize');
const {amountInKobo}=require('../utils/cautionFee');
module.exports=async(input,staff,quoteOnly=false)=>db.transaction(async transaction=>{
 const options={transaction,lock:transaction.LOCK.UPDATE};
 const booking=await Booking.findOne({where:{reference_id:input.reference_id},...options});
 if(!booking||booking.checked_out||!['success','confirmed','part-payment','completed'].includes(booking.status))throw Error('Only active bookings can be extended.');
 const nights=Number(input.extra_nights);
 if(!Number.isInteger(nights)||nights<1||nights>365)throw Error('Enter between 1 and 365 additional nights.');
 const oldEnd=new Date(booking.end);
 if(!input.expected_end||new Date(input.expected_end).getTime()!==oldEnd.getTime())throw Error('The booking has changed. Refresh before extending.');
 if(!Number.isFinite(oldEnd.getTime())||(!booking.checked_in&&oldEnd<new Date()))throw Error('This stay has already ended. Create a new booking.');
 const room=await RoomNumber.findOne({where:{_id:booking.room_id},...options});
 if(!room||room.is_retained)throw Error('The room is unavailable for extension.');
 const newEnd=new Date(oldEnd.getTime()+nights*86400000);
 if(newEnd<=new Date())throw Error('Add enough nights to extend checkout beyond the current time.');
 const overlap=await Booking.findOne({where:{id:{[Op.ne]:booking.id},room_id:booking.room_id,checked_out:false,
  status:{[Op.in]:['success','confirmed','part-payment','completed']},start:{[Op.lt]:newEnd},end:{[Op.gt]:oldEnd}},transaction});
 if(overlap)throw Error('This room is reserved during the requested extension.');
 const category=await Room.findOne({where:{_id:booking.category_id},...options});
 if(!category)throw Error('Room category not found.');
 let additional=0, addedSubtotal=0, addedDiscount=0;
 const rates=[];
 for(let day=0;day<nights;day++){
  const date=new Date(oldEnd.getTime()+day*86400000);
  const special=await Pricing.findOne({where:{category_id:booking.category_id,is_active:true,start_date:{[Op.lte]:date},end_date:{[Op.gte]:date}},order:[['created_at','DESC']],transaction});
  const baseRate=Math.round(Number(special?special.special_price:category.price)*100);
  const discount=booking.discount_scope==='booking' ? 0 : booking.discount_type==='percentage' ? require('../views/js/booking-pricing').discount(baseRate,'percentage',booking.discount_value||0) : Number(booking.discount_per_night||0);
  const rate=baseRate-discount;
  addedSubtotal+=baseRate;addedDiscount+=discount;
  if(!Number.isSafeInteger(rate)||rate<=0)throw Error('The nightly extension price is invalid.');
  rates.push(rate);additional+=rate;
 }
 const ledger=await Part.findOne({where:{reference_id:booking.reference_id},...options});
 const priorPaid=ledger?Number(ledger.amount_paid):['success','completed'].includes(booking.status)&&!Number(booking.balance)?Math.max(Number(booking.amount),Number(booking.amount_paid||0)):Number(booking.amount_paid||0);
 let total=Number(booking.amount)+additional;
 let subtotal=Number(booking.price_subtotal||Number(booking.amount)+Number(booking.discount_per_night||0)*Number(booking.night))+addedSubtotal;
 let discountTotal=Number(booking.discount_total||Number(booking.discount_per_night||0)*Number(booking.night))+addedDiscount;
 if(booking.discount_scope==='booking') {
  discountTotal=require('../views/js/booking-pricing').discount(subtotal,booking.discount_type||'flat',booking.discount_value||0);
  total=subtotal-discountTotal;
  additional=total-Number(booking.amount);
 }

 const due=Math.max(0,total-priorPaid);
 const paid=quoteOnly?0:amountInKobo(input.amount_paid_now===undefined?'0':input.amount_paid_now);
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(priorPaid)||priorPaid<0)throw Error('Invalid booking financial records.');
 if(paid>due)throw Error('Amount paid exceeds the revised outstanding balance.');
 const totalNights=Number(booking.night)+nights;
 if(!quoteOnly){
  if(!['full','partial'].includes(input.payment_option))throw Error('Choose full or part payment.');
  if(input.payment_option==='full'&&paid!==due)throw Error('Full payment must cover the revised balance.');
  if(input.payment_option==='partial'&&totalNights<=1)throw Error('Part payment is available for stays longer than one night.');
  if(!['cash','transfer','card'].includes(input.payment_method))throw Error('Choose a payment method.');
 }
 const balance=due-paid,amountPaid=priorPaid+paid,credit=Math.max(0,amountPaid-total);
 const result={old_end:oldEnd.toISOString(),new_end:newEnd.toISOString(),extra_nights:nights,nights:totalNights,rates,additional,total,previousPaid:priorPaid,due,balance,credit};
 if(quoteOnly)return result;
 const ledgerData={booking_id:booking.id,reference_id:booking.reference_id,total_amount:total,amount_paid:amountPaid,balance,
  guest_name:booking.guest_name,guest_email:booking.guest_email,guest_phone:booking.guest_phone,
  room_name:booking.room_name,room_number:booking.room_number,category_name:booking.category_name,
  start_date:booking.start,end_date:newEnd,payment_status:balance?'partial':'completed',updated_at:new Date()};
 const saved=ledger?await ledger.update(ledgerData,{transaction}):await Part.create(ledgerData,{transaction});
 if(paid>0)await History.create({booking_id:booking.id,part_payment_id:saved._id,reference_id:booking.reference_id,
  payment_amount:paid,payment_type:balance?'partial':'final',payment_method:input.payment_method,balance_before:due,balance_after:balance,
  total_amount:total,guest_name:booking.guest_name,room_number:booking.room_number,recorded_by:staff.name,payment_date:new Date(),notes:`Stay extended by ${nights} night(s)`},{transaction});
 await Extension.create({booking_id:booking.id,reference_id:booking.reference_id,old_end:oldEnd,new_end:newEnd,added_nights:nights,
  additional_amount:additional,amount_paid_now:paid,balance_after:balance,credit_after:credit,extended_by:staff.name},{transaction});
 await Booking.update({end:newEnd,night:totalNights,amount:total,price_subtotal:subtotal,discount_total:discountTotal,amount_paid:amountPaid,balance,is_part_payment:balance>0,status:balance?'part-payment':'success'},{where:{id:booking.id},transaction});
 return result;
});
