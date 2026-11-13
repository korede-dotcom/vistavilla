'use strict';
const router=require('express').Router(),handler=require('express-async-handler'),crypto=require('crypto');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),role=require('../utils/userRole');
const token=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('clear-balance:'+req.cookies.jwtToken).digest('hex');
router.use(auth,handler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(role(user)))return res.status(403).json({status:false,message:'Hotel staff access required.'});
 req.user.roleName=role(user);res.set('Cache-Control','no-store');next();
}));
router.get('/',handler(async(req,res)=>res.json({status:true,csrf:token(req)})));
router.post('/:id',handler(async(req,res)=>{
 if(typeof req.body.csrf!=='string'||req.body.csrf!==token(req))return res.status(403).json({status:false,message:'Refresh the page and try again.'});
 try{await require('../services/clearBalance')(req.params.id,req.body.reason,req.user);res.json({status:true,message:'Balance cleared without recording a payment.'});}
 catch(error){res.status(400).json({status:false,message:error.message});}
}));
module.exports=router;
