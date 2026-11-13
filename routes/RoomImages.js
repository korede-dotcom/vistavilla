'use strict';
const router=require('express').Router(),handler=require('express-async-handler');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),Room=require('../models/RoomNumbers'),Images=require('../models/Images'),cloudinary=require('../repos/cloudinary');
const photos=require('../services/publicPhotos'),policy=require('../utils/publicPhoto');
router.use(auth,handler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(require('../utils/userRole')(user)))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 const id=req.query.room_id||(req.body||{}).room_id;if(!/^\d+$/.test(String(id)))return res.status(400).json({status:false,message:'Select a room.'});
 req.photoRoom=await Room.findByPk(id);if(!req.photoRoom)return res.status(404).json({status:false,message:'Room not found.'});next();
}));
router.get('/',handler(async(req,res)=>res.json({status:true,data:{images:await Images.findAll({where:{for:'hotelroom',room_id:req.photoRoom._id},order:[['_id','DESC']]})}})));
const upload=cloudinary.createParser(req=>policy.folder()+'/rooms/'+req.photoRoom._id,10);
router.post('/',upload,handler(async(req,res)=>{
 if(!req.files||!req.files.length)return res.status(400).json({status:false,message:'Choose room photos to upload.'});
 const created=await Images.bulkCreate(req.files.map(file=>({for:'hotelroom',room_id:req.photoRoom._id,user_id:req.user._id,public_id:file.filename,url:file.path,status:true})));
 photos.invalidate();res.json({status:true,data:{images:created}});
}));
router.delete('/',handler(async(req,res)=>{
 const photo=await Images.findOne({where:{_id:req.body.image_id,room_id:req.photoRoom._id,for:'hotelroom'}});
 if(!photo)return res.status(404).json({status:false,message:'Room photo not found.'});
 if(!policy.allowedId(photo.public_id))return res.status(400).json({status:false,message:'Manage legacy photos directly in Cloudinary.'});
 await cloudinary.delete(photo.public_id);await photo.destroy();photos.invalidate();res.json({status:true,message:'Room photo removed.'});
}));
module.exports=router;
