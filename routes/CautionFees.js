'use strict';
const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const auth = require('../middleware/checkAuthCookie');
const Booking = require('../models/HotelBooking');
const User = require('../models/User');
const fees = require('../services/cautionFees');
const Settings = require('../models/HotelSettings');
const { amountInKobo } = require('../utils/cautionFee');
const { Op } = require('sequelize');
router.use(auth, asyncHandler(async (req,res,next) => {
  const user = await User.findByPk(req.user._id);
  if (!user || !['ceo','hotelmanager','hotel receptionist'].includes(user.roleName)) return res.status(403).send('Hotel staff access required.');
  res.set('Cache-Control','no-store');
  next();
}));
const token = req => crypto.createHmac('sha256',process.env.JWT_SECRET).update('caution:'+req.cookies.jwtToken).digest('hex');
router.get('/',asyncHandler(async(req,res)=>{
  const setting = await Settings.findByPk(1);
  const bookings = await Booking.findAll({ where: { caution_fee_amount: { [Op.gt]: 0 } }, order: [['createdAt','DESC']] });
  res.render(require('path').join(__dirname,'../views/portal/caution-fees.ejs'),{
    name:req.user.name,email:req.user.email,roleName:req.user.roleName,bookings,
    reference:typeof req.query.reference==='string'?req.query.reference:'',total:await fees.summary(),defaultFee:setting?Number(setting.caution_fee_default):0,csrf:token(req),saved:req.query.saved==='1'
  });
}));
router.get('/default',asyncHandler(async(req,res)=>{
 const setting=await Settings.findByPk(1);
 res.json({amount:setting?Number(setting.caution_fee_default)/100:0});
}));
router.post('/default',asyncHandler(async(req,res)=>{
 const expected=Buffer.from(token(req));const actual=Buffer.from(typeof req.body.csrf==='string'?req.body.csrf:'');
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(403).send('Reload the caution fee page and try again.');
 let amount;
 try{amount=amountInKobo(req.body.amount);}catch(error){return res.status(400).send(error.message);}
 const setting=await Settings.findByPk(1);
 if(setting)await setting.update({caution_fee_default:amount});
 else await Settings.create({id:1,caution_fee_default:amount});
 res.redirect('/portal/caution-fees?saved=1');
}));
router.post('/collect',asyncHandler(async(req,res)=>{
 const expected=Buffer.from(token(req));const actual=Buffer.from(typeof req.body.csrf==='string'?req.body.csrf:'');
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(403).send('Reload the caution fee page and try again.');
 try{await fees.collect(req.body.reference_id,req.body.amount,req.user);}
 catch(error){return res.status(400).send(error.message);}
 res.redirect('/portal/caution-fees?saved=1');
}));
router.post('/:id/status',asyncHandler(async(req,res)=>{
  const expected=Buffer.from(token(req));const actual=Buffer.from(typeof req.body.csrf==='string'?req.body.csrf:'');
  if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(403).send('Reload the caution fee page and try again.');
  try { await fees.changeStatus(req.params.id,req.body.action,req.user); }
  catch(error){ return res.status(400).send(error.message); }
  res.redirect('/portal/caution-fees?saved=1');
}));
module.exports=router;
