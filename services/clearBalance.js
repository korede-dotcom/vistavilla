'use strict';
const db=require('../config/connectDB'),Booking=require('../models/HotelBooking'),Part=require('../models/PartPayment'),Clearance=require('../models/BalanceClearance'),Log=require('../models/ActivityLog');
module.exports=async function clearBalance(id,reason,staff){
 if(typeof reason!=='string'||reason.trim().length<5||reason.trim().length>1000)throw Error('Enter a reason between 5 and 1000 characters.');
 return db.transaction(async transaction=>{
  const initial=await Part.findOne({where:{_id:id},transaction});
  if(!initial)throw Error('Part payment not found.');
  const booking=await Booking.findOne({where:{reference_id:initial.reference_id},transaction,lock:transaction.LOCK.UPDATE});
  const part=await Part.findOne({where:{_id:id},transaction,lock:transaction.LOCK.UPDATE});
  if(!booking||!part)throw Error('Booking or part payment not found.');
  if(['cancelled','initiated','pending'].includes(booking.status))throw Error('Only a confirmed booking balance can be cleared.');
  const balance=Number(part.balance),paid=Number(part.amount_paid),total=Number(part.total_amount);
  if(part.payment_status!=='partial'||balance<=0)throw Error('This balance is already settled.');
  if(![balance,paid,total].every(Number.isSafeInteger)||paid<0||total-paid!==balance||Number(booking.amount)!==total||Number(booking.balance)!==balance)throw Error('Booking and payment balances differ. Review them before clearing.');
  const discount=Number(booking.discount_total||0)+balance;
  const subtotal=Number(booking.amount)+Number(booking.discount_total||0);
  await Clearance.create({booking_id:booking.id,part_payment_id:part._id,reference_id:part.reference_id,guest_name:part.guest_name,room_number:part.room_number,amount:balance,old_total:total,new_total:paid,reason:reason.trim(),cleared_by:String(staff._id),cleared_by_name:staff.name,cleared_by_role:staff.roleName},{transaction});
  await part.update({total_amount:paid,balance:0,payment_status:'completed',updated_at:new Date()},{transaction});
  await Booking.update({amount:paid,amount_paid:paid,balance:0,is_part_payment:false,status:'success',price_subtotal:subtotal,discount_total:discount,discount_type:'flat',discount_scope:'booking',discount_value:discount/100,discount_per_night:discount/100},{where:{id:booking.id},transaction});
  await Log.create({actor_id:String(staff._id),actor_name:staff.name,actor_role:staff.roleName,action:'update',resource:'balance_clearance',record_id:part.reference_id,description:`Cleared unpaid balance of ₦${(balance/100).toLocaleString('en-NG')} for ${part.guest_name}, Room ${part.room_number} (${part.reference_id}). Reason: ${reason.trim()}. No money received.`,outcome:'success',fields:['balance','reason']},{transaction});
  return {amount:balance};
 });
};
