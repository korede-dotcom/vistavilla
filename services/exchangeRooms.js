'use strict';
const db=require('../config/connectDB'),Booking=require('../models/HotelBooking'),Rooms=require('../models/RoomNumbers'),Categories=require('../models/Room'),Part=require('../models/PartPayment'),Transfer=require('../models/RoomTransfer'),Log=require('../models/ActivityLog');
const {Op}=require('sequelize'),availability=require('../utils/transferAvailability');
module.exports=async function exchange(input,staff){
 if(!input.reference_id||!input.other_reference||input.reference_id===input.other_reference)throw Error('Select two different bookings.');
 return db.transaction(async transaction=>{
  const bookings=await Booking.findAll({where:{reference_id:{[Op.in]:[input.reference_id,input.other_reference]}},order:[['id','ASC']],transaction,lock:transaction.LOCK.UPDATE});
  if(bookings.length!==2)throw Error('Both bookings must exist.');
  const a=bookings.find(row=>row.reference_id===input.reference_id),b=bookings.find(row=>row.reference_id===input.other_reference);
  for(const booking of [a,b])if(!booking.checked_in||booking.checked_out||!['success','confirmed','part-payment','completed'].includes(booking.status))throw Error('Both customers must be checked in with an active booking.');
  if(String(a.room_id)===String(b.room_id))throw Error('These bookings already use the same room.');
  if(String(a.room_id)!==String(input.room_id)||String(b.room_id)!==String(input.other_room_id))throw Error('A booking has moved. Reload the exchange dialog.');
  const rooms=await Rooms.findAll({where:{_id:{[Op.in]:[a.room_id,b.room_id]}},order:[['_id','ASC']],transaction,lock:transaction.LOCK.UPDATE});
  const ids=bookings.map(row=>row.id);
  for(const [booking,other] of [[a,b],[b,a]]){
   const destination=rooms.find(room=>String(room._id)===String(other.room_id));
   if(!destination)throw Error('Room not found.');
   const window=availability.windowFor(booking);
   if(availability.retained(destination,window))throw Error('An exchanged room is retained during the remaining stay.');
   const conflict=await Booking.findOne({where:{...availability.overlap(booking,window),id:{[Op.notIn]:ids},room_id:destination._id},transaction});
   if(conflict)throw Error('An exchanged room has another booking during the remaining stay.');
  }
  for(const [booking,other] of [[a,b],[b,a]]){
   const destination=rooms.find(room=>String(room._id)===String(other.room_id));
   const category=await Categories.findOne({where:{_id:destination.category_id},transaction});
   if(!category)throw Error('Room category not found.');
   const details={room_id:destination._id,room_number:destination.room_number,room_name:destination.room_name,category_id:destination.category_id,category_name:category.category_name};
   await Transfer.create({booking_reference:booking.reference_id,guest_name:booking.guest_name,old_room_id:booking.room_id,old_room_number:booking.room_number,old_room_name:booking.room_name,old_category_id:booking.category_id,old_category_name:booking.category_name,new_room_id:destination._id,new_room_number:destination.room_number,new_room_name:destination.room_name,new_category_id:destination.category_id,new_category_name:category.category_name,transferred_by:staff.name,transfer_reason:'Room exchange with '+other.guest_name+' ('+other.reference_id+'). '+String(input.reason||'').slice(0,500),booking_start:booking.start,booking_end:booking.end,old_total:booking.amount,new_total:booking.amount,price_adjustment:0,amount_paid_now:0,balance_after:booking.balance||0},{transaction});
   await Booking.update(details,{where:{id:booking.id},transaction});
   await Part.update({room_number:destination.room_number,room_name:destination.room_name,category_name:category.category_name,is_room_transfer:true,previous_room_number:booking.room_number},{where:{reference_id:booking.reference_id},transaction});
  }
  await Log.create({actor_id:String(staff._id),actor_name:staff.name,actor_role:staff.roleName,action:'update',resource:'room_exchange',record_id:a.reference_id,description:`Exchanged Room ${a.room_number} (${a.guest_name}, ${a.reference_id}) with Room ${b.room_number} (${b.guest_name}, ${b.reference_id}); booking prices and payments unchanged.`,outcome:'success',fields:['room_id','room_number','category_id']},{transaction});
  return {message:'Rooms exchanged successfully. Booking prices and payments are unchanged.'};
 });
};
