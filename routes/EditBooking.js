'use strict';
const router=require('express').Router(),asyncHandler=require('express-async-handler'),crypto=require('crypto');
const auth=require('../middleware/checkAuthCookie'),User=require('../models/User'),Booking=require('../models/HotelBooking'),Revision=require('../models/BookingRevision');
const edit=require('../services/editBooking'),{initial}=require('../utils/bookingEdit');
const token=req=>crypto.createHmac('sha256',process.env.JWT_SECRET).update('edit-booking:'+req.cookies.jwtToken).digest('hex');
router.use(auth,asyncHandler(async(req,res,next)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager','hotel receptionist'].includes(user.roleName))return res.status(403).send('Hotel staff access required.');
 res.set('Cache-Control','no-store');next();
}));
router.get('/:reference',asyncHandler(async(req,res)=>{
 const booking=await Booking.findOne({where:{reference_id:req.params.reference}});
 if(!booking)return res.status(404).send('Booking not found.');
 if(booking.checked_out||!['success','confirmed','part-payment','completed'].includes(booking.status))return res.status(400).send('Only active bookings can be edited.');
 const revisions=await Revision.findAll({where:{booking_id:booking.id},limit:20,order:[['createdAt','DESC'],['id','DESC']]});
 res.render(require('path').join(__dirname,'../views/portal/edit-booking.ejs'),{booking,defaults:initial(booking),csrf:token(req),revisions,name:req.user.name,email:req.user.email,roleName:req.user.roleName});
}));
router.post('/:reference/:action?',asyncHandler(async(req,res)=>{
 if(req.params.action&&req.params.action!=='quote')return res.status(404).json({status:false,message:'Unknown booking action.'});
 const actual=Buffer.from(typeof req.body.csrf==='string'?req.body.csrf:''),expected=Buffer.from(token(req));
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(403).json({status:false,message:'Reload the booking editor and try again.'});
 try{res.json({status:true,data:await edit(req.params.reference,req.body,req.user,req.params.action==='quote'),message:'Booking updated.'});}
 catch(error){res.status(400).json({status:false,message:error.message});}
}));
module.exports=router;
