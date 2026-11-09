'use strict';
const db=require('../config/connectDB');
const Booking=require('../models/HotelBooking');
const RoomNumber=require('../models/RoomNumbers');
const Part=require('../models/PartPayment');
const History=require('../models/PaymentHistory');
const Revision=require('../models/BookingRevision');
const {Op}=require('sequelize');
const pricing=require('../views/js/booking-pricing');
const {amountInKobo}=require('../utils/cautionFee');
const {initial,guest,financialSnapshot,dateAtSameTime}=require('../utils/bookingEdit');
module.exports=async function editBooking(reference,input,staff,quoteOnly=false){
 return db.transaction(async transaction=>{
  const options={transaction,lock:transaction.LOCK.UPDATE};
  const booking=await Booking.findOne({where:{reference_id:reference},...options});
  if(!booking||booking.checked_out||!['success','confirmed','part-payment','completed'].includes(booking.status))throw Error('Only active bookings can be edited.');
  const defaults=initial(booking);
  if(input.expected_version!==defaults.expected_version)throw Error('This booking has changed. Reload it before editing.');
  const guests=guest(input);
  if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)throw Error('Enter a reason for this booking edit (up to 1,000 characters).');
  const room=await RoomNumber.findOne({where:{_id:booking.room_id},...options});
  if(!room)throw Error('Booking room not found.');
  // Validate every proposed rate/discount using the shared integer-kobo calculator.
  const quote=pricing.quote({start:input.start,end:input.end,rate:input.rate,discountType:input.discount_type,discountValue:input.discount_value});
  const unchanged=input.start===defaults.start&&input.end===defaults.end&&Number(input.rate)===Number(defaults.rate)&&input.discount_type===defaults.discount_type&&Number(input.discount_value)===Number(defaults.discount_value);
  // A guest-only edit must not reprice mixed-rate or historical bookings.
  if(unchanged)Object.assign(quote,{total:Number(booking.amount),subtotal:Number(booking.price_subtotal||Number(booking.amount)+Number(booking.discount_total||Number(booking.discount_per_night||0)*Number(booking.night))),discountTotal:Number(booking.discount_total||Number(booking.discount_per_night||0)*Number(booking.night))});
  if (![quote.total,quote.subtotal,quote.discountTotal].every(Number.isSafeInteger) || quote.total < 0) throw Error('Invalid existing booking totals.');
  const start=dateAtSameTime(input.start,booking.start),end=dateAtSameTime(input.end,booking.end);
  if(end<=start)throw Error('Checkout must be after check-in.');
  if(end<=new Date())throw Error('The revised checkout must be in the future.');
  if(room.is_retained&&(start.getTime()!==new Date(booking.start).getTime()||end.getTime()!==new Date(booking.end).getTime()))throw Error('The room is retained; release it before changing booking dates.');
  const overlap=await Booking.findOne({where:{id:{[Op.ne]:booking.id},room_id:booking.room_id,checked_out:false,status:{[Op.in]:['success','confirmed','part-payment','completed']},start:{[Op.lt]:end},end:{[Op.gt]:start}},transaction});
  if(overlap)throw Error('The revised dates overlap another reservation for this room.');
  const ledger=await Part.findOne({where:{reference_id:reference},...options});
  const priorPaid=ledger?Number(ledger.amount_paid):['success','completed'].includes(booking.status)&&!Number(booking.balance)?Math.max(Number(booking.amount),Number(booking.amount_paid||0)):Number(booking.amount_paid||0);
  const paid=amountInKobo(input.amount_paid_now===undefined?'0':input.amount_paid_now);
  const due=Math.max(0,quote.total-priorPaid);
  if(!Number.isSafeInteger(priorPaid)||priorPaid<0)throw Error('Invalid existing payment records.');
  if(paid>due)throw Error('Additional payment exceeds the revised balance.');
  if(!['cash','transfer','card'].includes(input.payment_method))throw Error('Select a payment method.');
  const amountPaid=priorPaid+paid,balance=Math.max(0,quote.total-amountPaid),credit=Math.max(0,amountPaid-quote.total);
  const data={...guests,start,end,night:quote.nights,amount:quote.total,amount_paid:amountPaid,balance,is_part_payment:balance>0,status:balance?'part-payment':'success'};
  if(!unchanged)Object.assign(data,{discount_scope:'booking',discount_type:quote.discountType,discount_value:quote.discountValue,discount_per_night:0,price_subtotal:quote.subtotal,discount_total:quote.discountTotal});
  const result={...quote,start:start.toISOString(),end:end.toISOString(),previousPaid:priorPaid,paidNow:paid,balance,credit};
  if(quoteOnly)return result;
  const ledgerData={booking_id:booking.id,reference_id:reference,total_amount:quote.total,amount_paid:amountPaid,balance,
   ...guests,room_name:booking.room_name,room_number:booking.room_number,category_name:booking.category_name,
   start_date:start,end_date:end,payment_status:balance?'partial':'completed',updated_at:new Date()};
  // guest_address/count are booking fields, not payment ledger columns.
  delete ledgerData.guest_address;delete ledgerData.guest_count;
  const saved=ledger?await ledger.update(ledgerData,{transaction}):await Part.create(ledgerData,{transaction});
  if(paid>0)await History.create({booking_id:booking.id,part_payment_id:saved._id,reference_id:reference,payment_amount:paid,
   payment_type:balance?'partial':'final',payment_method:input.payment_method,balance_before:due,balance_after:balance,total_amount:quote.total,
   guest_name:guests.guest_name,room_number:booking.room_number,recorded_by:staff.name,payment_date:new Date(),notes:'Additional payment during booking edit'},{transaction});
  const before=financialSnapshot(booking);before.amount_paid=priorPaid;
  const after=financialSnapshot({...booking.get({plain:true}),...data});
  await Revision.create({booking_id:booking.id,reference_id:reference,edited_by:staff.name,editor_id:String(staff._id),reason:input.reason.trim(),
   before,after,amount_paid_now:paid,guest_fields_changed:Object.keys(guests).filter(key=>String(booking[key])!==String(guests[key]))},{transaction});
  await Booking.update(data,{where:{id:booking.id},transaction});
  return result;
 });
};
