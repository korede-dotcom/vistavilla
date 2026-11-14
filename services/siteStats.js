'use strict';
const Bookings=require('../models/HotelBooking'),Rooms=require('../models/RoomNumbers');
module.exports=async()=>{
 const [totalBookings,totalRooms]=await Promise.all([Bookings.count(),Rooms.count()]);
 return {totalBookings:Number(totalBookings),totalRooms:Number(totalRooms)};
};
