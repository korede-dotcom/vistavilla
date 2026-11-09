'use strict';
const router=require('express').Router();
const auth=require('../middleware/checkAuthCookie');
const asyncHandler=require('express-async-handler');
const User=require('../models/User');
const extend=require('../services/extendStay');
const crypto=require('crypto');
const token=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('extend:'+req.cookies.jwtToken).digest('hex');
router.use(auth,asyncHandler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(user.roleName))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 res.set('Cache-Control','no-store');next();
}));
router.get('/quote',asyncHandler(async(req,res)=>{
 try{res.json({status:true,data:await extend(req.query,req.user,true),csrf:token(req)});}
 catch(error){res.status(400).json({status:false,message:error.message});}
}));
router.post('/',asyncHandler(async(req,res)=>{
 const actual=Buffer.from(typeof req.body.csrf==='string'?req.body.csrf:''),expected=Buffer.from(token(req));
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(403).json({status:false,message:'Refresh the extension preview and try again.'});
 try{res.json({status:true,data:await extend(req.body,req.user),message:'Stay extended successfully.'});}
 catch(error){res.status(400).json({status:false,message:error.message});}
}));
module.exports=router;
