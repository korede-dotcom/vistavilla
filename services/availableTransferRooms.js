'use strict';
const Booking=require('../models/HotelBooking');
const Rooms=require('../models/RoomNumbers');
const availability=require('../utils/transferAvailability');
module.exports=async function availableTransferRooms(reference,categoryId) {
 const booking=await Booking.findOne({where:{reference_id:reference}});
 if(!booking||booking.checked_out||['cancelled','initiated','pending'].includes(booking.status))throw Error('Only active bookings can be transferred.');
 const window=availability.windowFor(booking);
 const [rooms,occupied]=await Promise.all([
  Rooms.findAll({where:categoryId?{category_id:categoryId}:{},order:[['room_number','ASC']]}),
  Booking.findAll({where:availability.overlap(booking,window),attributes:['room_id']})
 ]);
 const blocked=new Set(occupied.map(row=>String(row.room_id)));
 return rooms.filter(room=>String(room._id)!==String(booking.room_id)&&!blocked.has(String(room._id))&&!availability.retained(room,window));
};
