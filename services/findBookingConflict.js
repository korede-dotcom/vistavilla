'use strict';
const Booking=require('../models/HotelBooking'),stay=require('../utils/stayWindow');
module.exports=async(where,window,transaction)=>{
 const candidates=await Booking.findAll({where:{...where,...stay.overlap(window)},...(transaction?{transaction}:{})});
 // Older model hooks shifted noon based on the host timezone. Compare stay days
 // against the agreed Lagos checkout deadline without rewriting payment/history records.
 return candidates.find(booking=>stay.overlapsDates(booking,window))||null;
};
