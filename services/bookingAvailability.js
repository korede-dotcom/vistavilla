'use strict';
const Booking=require('../models/HotelBooking'),Rooms=require('../models/RoomNumbers'),stay=require('../utils/stayWindow'),{retained}=require('../utils/transferAvailability');
module.exports=async(category_id,window)=>{
 const [rooms,bookings]=await Promise.all([Rooms.findAll({where:{category_id},order:[['room_number','ASC']]}),Booking.findAll({where:{category_id,...stay.overlap(window)},attributes:['room_id','room_number','start','end']})]);
 const overlapping=bookings.filter(booking=>stay.overlapsDates(booking,window));
 const blockedIds=new Set(overlapping.filter(row=>row.room_id!=null).map(row=>String(row.room_id))),blockedNumbers=new Set(overlapping.filter(row=>row.room_id==null).map(row=>String(row.room_number)));
 const booked=room=>blockedIds.has(String(room._id))||blockedNumbers.has(String(room.room_number));
 const availableRoomDetails=rooms.filter(room=>!booked(room)&&!retained(room,window));
 return {totalRooms:rooms.length,bookedRooms:rooms.filter(booked).length,availableRooms:availableRoomDetails.length,availableRoomDetails};
};
