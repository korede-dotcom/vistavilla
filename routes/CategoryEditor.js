'use strict';
const router=require('express').Router(),handler=require('express-async-handler'),crypto=require('crypto');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),Category=require('../models/Room');
const token=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('category-editor:'+req.cookies.jwtToken).digest('hex');
router.use(auth,handler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(user.roleName))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 res.set('Cache-Control','no-store');next();
}));
router.get('/:id',handler(async(req,res)=>{
 const category=await Category.findOne({where:{_id:req.params.id}});
 if(!category)return res.status(404).json({status:false,message:'Category not found.'});
 res.json({status:true,data:{category,csrf:token(req)}});
}));
router.patch('/:id',handler(async(req,res)=>{
 if(typeof req.body.csrf!=='string'||req.body.csrf!==token(req))return res.status(403).json({status:false,message:'Reload the category editor and try again.'});
 const data={};
 for(const field of ['category_name','room_type','food','cancellations_fee','description']) {
  if(typeof req.body[field]!=='string')return res.status(400).json({status:false,message:'Complete all category fields.'});
  data[field]=req.body[field].trim();
  if((field!=='cancellations_fee'&&!data[field])||data[field].length>(field==='description'?10000:255))return res.status(400).json({status:false,message:'Enter valid category details.'});
 }
 if(!/^\d+(?:\.\d{1,2})?$/.test(String(req.body.price))||Number(req.body.price)<=0||Number(req.body.price)>99999999.99)return res.status(400).json({status:false,message:'Enter a valid nightly price with at most two decimal places.'});
 data.price=String(req.body.price);
 for(const field of ['num_beds','number_of_guests']) {
  if(!/^\d+$/.test(String(req.body[field]))||Number(req.body[field])<1||Number(req.body[field])>1000)return res.status(400).json({status:false,message:'Beds and guest capacity must be between 1 and 1000.'});
  data[field]=Number(req.body[field]);
 }
 for(const field of ['has_ac','has_wifi','status']) {
  if(typeof req.body[field]!=='boolean')return res.status(400).json({status:false,message:'Invalid category option.'});
  data[field]=req.body[field];
 }
 const category=await Category.findOne({where:{_id:req.params.id}});
 if(!category)return res.status(404).json({status:false,message:'Category not found.'});
 await category.update(data);
 require('../services/publicPhotos').invalidate();
 res.json({status:true,message:'Room category saved.'});
}));
// Photo operations use the same staff authorization and session token as detail edits.
router.use('/:id/photos',handler(async(req,res,next)=>{
 if(req.get('X-CSRF-Token')!==token(req))return res.status(403).json({status:false,message:'Reload the category editor and try again.'});
 const category=await Category.findOne({where:{_id:req.params.id}});
 if(!category)return res.status(404).json({status:false,message:'Category not found.'});
 req.editCategory=category;next();
}));
router.post('/:id/photos',(req,res,next)=>{
 const policy=require('../utils/publicPhoto');
 require('../repos/cloudinary').createParser(policy.folder()+'/categories/'+req.params.id,10)(req,res,next);
},handler(async(req,res)=>{
 if(!req.files||!req.files.length)return res.status(400).json({status:false,message:'Select category photos to upload.'});
 const picture=[...(req.editCategory.picture||[]),...req.files.map(file=>file.path)];
 await req.editCategory.update({picture});
 require('../services/publicPhotos').invalidate();
 res.json({status:true,data:{picture},message:'Category photos uploaded.'});
}));
router.delete('/:id/photos',handler(async(req,res)=>{
 const existing=req.editCategory.picture||[];
 if(typeof req.body.url!=='string'||!existing.includes(req.body.url))return res.status(404).json({status:false,message:'Category photo not found.'});
 const picture=existing.filter(url=>url!==req.body.url);
 await req.editCategory.update({picture});
 require('../services/publicPhotos').invalidate();
 res.json({status:true,data:{picture},message:'Photo removed from this category.'});
}));
module.exports=router;
