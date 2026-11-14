'use strict';
const db=require('../config/connectDB'),Booking=require('../models/HotelBooking'),Rooms=require('../models/RoomNumbers'),Log=require('../models/ActivityLog');
const {Op}=require('sequelize'),stay=require('../utils/stayWindow');
module.exports=async function releaseRooms(now=new Date()){
 // Include all missed prior days and today's persisted noon checkout timestamps.
 const limit=new Date(stay.lagosDay(now)+'T23:59:59.999+01:00');
 const candidates=await Booking.findAll({where:{checked_out:false,status:{[Op.in]:stay.statuses},end:{[Op.lte]:limit}},attributes:['id','end'],order:[['id','ASC']]});
 let released=0;
 for(const candidate of candidates){
  if(stay.checkoutAt(candidate.end)>now)continue;
  await db.transaction(async transaction=>{
   const options={transaction,lock:transaction.LOCK.UPDATE};
   const booking=await Booking.findOne({where:{id:candidate.id},...options});
   if(!booking||booking.checked_out||!stay.statuses.includes(booking.status)||stay.checkoutAt(booking.end)>now)return;
   const room=await Rooms.findOne({where:booking.room_id?{_id:booking.room_id}:{room_number:booking.room_number},...options});
   await booking.update({checked_out:true},{transaction});
   let occupied=true;
   if(room){
    const active=await Booking.findOne({where:{id:{[Op.ne]:booking.id},room_id:room._id,checked_in:true,checked_out:false,status:{[Op.in]:stay.statuses},start:{[Op.lte]:now},end:{[Op.gt]:now}},transaction});
    occupied=Boolean(active);
    if(!occupied)await room.update({status:false},{transaction});
   }
   await Log.create({actor_name:'System',action:'update',resource:'hotelbooking',record_id:booking.reference_id,description:`Automatically checked out ${booking.guest_name} from Room ${booking.room_number} (${booking.reference_id}) at the 11:59 AM Lagos checkout deadline. ${occupied?'Room occupancy preserved.':'Room released.'} Payment balances unchanged.`,outcome:'success',fields:['checked_out']},{transaction});
   released++;
  });
 }
 return released;
};
