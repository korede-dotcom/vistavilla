'use strict';
const router=require('express').Router(),handler=require('express-async-handler'),crypto=require('crypto'),{Op}=require('sequelize');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),Booking=require('../models/HotelBooking');
const token=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('room-exchange:'+req.cookies.jwtToken).digest('hex');
router.use(auth,handler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(require('../utils/userRole')(user)))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 req.user.roleName=require('../utils/userRole')(user);res.set('Cache-Control','no-store');next();
}));
router.get('/',handler(async(req,res)=>{
 const bookings=await Booking.findAll({where:{checked_in:true,checked_out:false,status:{[Op.in]:['success','confirmed','part-payment','completed']},end:{[Op.gt]:new Date()}},attributes:['reference_id','room_id','room_number','guest_name'],order:[['room_number','ASC']]});
 let rooms=[];
 if(req.query.reference_id){try{rooms=await require('../services/availableTransferRooms')(req.query.reference_id);}catch(error){return res.status(400).json({status:false,message:error.message});}}
 res.json({status:true,data:{bookings,rooms,csrf:token(req)}});
}));
router.post('/',handler(async(req,res)=>{
 if(typeof req.body.csrf!=='string'||req.body.csrf!==token(req))return res.status(403).json({status:false,message:'Reload the exchange dialog and try again.'});
 try{
  if(req.body.mode==='free') {
   await require('../services/transferRoom')({reference_id:req.body.reference_id,old_room_id:req.body.room_id,new_room_id:req.body.new_room_id,amount_paid_now:0,transfer_reason:req.body.reason},req.user,false,{exchange:true});
   return res.json({status:true,message:'Customer moved to the available room. Booking price and payments are unchanged.'});
  }
  const result=await require('../services/exchangeRooms')(req.body,req.user);res.json({status:true,...result});
 }
 catch(error){res.status(400).json({status:false,message:error.message});}
}));
module.exports=router;
