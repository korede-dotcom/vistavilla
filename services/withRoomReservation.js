'use strict';
const db=require('../config/connectDB'),Rooms=require('../models/RoomNumbers'),Booking=require('../models/HotelBooking'),{Op}=require('sequelize');
module.exports=(category_id,room_number,window,save)=>db.transaction(async transaction=>{
 const room=await Rooms.findOne({where:{category_id,room_number},transaction,lock:transaction.LOCK.UPDATE});
 if(!room)throw Error('Room not found.');
 if(require('../utils/transferAvailability').retained(room,window))throw Error('This room is retained for these dates.');
 const conflict=await require('./findBookingConflict')({[Op.or]:[{room_id:room._id},{room_id:null,room_number:room.room_number}]},window,transaction);
 if(conflict)throw Error('This room has just been booked for these dates. Select another room.');
 return save(room,transaction);
});
