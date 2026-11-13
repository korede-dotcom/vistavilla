'use strict';
const router=require('express').Router(),handler=require('express-async-handler'),crypto=require('crypto');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),Rooms=require('../models/RoomNumbers'),Categories=require('../models/Room'),Bookings=require('../models/HotelBooking');
const {Op}=require('sequelize');
const csrf=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('room-editor:'+req.cookies.jwtToken).digest('hex');
router.use(auth,handler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(user.roleName))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 res.set('Cache-Control','no-store');next();
}));
router.get('/:id',handler(async(req,res)=>{
 const room=await Rooms.findByPk(req.params.id);
 if(!room)return res.status(404).json({status:false,message:'Room not found.'});
 const categories=await Categories.findAll({attributes:['_id','category_name'],order:[['category_name','ASC']]});
 res.json({status:true,data:{room,categories,csrf:csrf(req)}});
}));
router.patch('/:id',handler(async(req,res)=>{
 if(typeof req.body.csrf!=='string'||req.body.csrf!==csrf(req))return res.status(403).json({status:false,message:'Reload the room editor and try again.'});
 const name=typeof req.body.room_name==='string'?req.body.room_name.trim():'';
 const number=typeof req.body.room_number==='string'?req.body.room_number.trim():'';
 if(!name||!number||name.length>255||number.length>255||!/^\d+$/.test(String(req.body.category_id)))return res.status(400).json({status:false,message:'Enter a room name, room number and category (maximum 255 characters).'});
 try {
  await Rooms.sequelize.transaction(async transaction=>{
   const room=await Rooms.findByPk(req.params.id,{transaction,lock:transaction.LOCK.UPDATE});
   if(!room)throw Error('Room not found.');
   const category=await Categories.findByPk(req.body.category_id,{transaction});
   if(!category)throw Error('Select an existing room category.');
   if(String(room.category_id)!==String(category._id)) {
    const active=await Bookings.count({where:{room_id:room._id,checked_out:false,status:{[Op.in]:['success','confirmed','part-payment','completed']},end:{[Op.gt]:new Date()}},transaction});
    if(active)throw Error('This room has active or upcoming bookings. Transfer those bookings before changing its category.');
   }
   await room.update({room_name:name,room_number:number,category_id:category._id},{transaction});
  });
  require('../services/publicPhotos').invalidate();
  res.json({status:true,message:'Room details saved.'});
 }catch(error){res.status(400).json({status:false,message:error.name==='SequelizeUniqueConstraintError'?'That room name or number is already in use.':error.message});}
}));
module.exports=router;
