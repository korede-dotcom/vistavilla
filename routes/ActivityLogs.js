'use strict';
const router=require('express').Router();
const asyncHandler=require('express-async-handler');
const auth=require('../middleware/checkAuthCookie');
const User=require('../models/User');
const Log=require('../models/ActivityLog');
router.get('/',auth,asyncHandler(async(req,res)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager'].includes(user.roleName))return res.status(403).send('CEO or hotel manager access required.');
 res.set('Cache-Control','no-store');
 const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
 const {rows,count}=await Log.findAndCountAll({limit:50,offset:(page-1)*50,order:[['createdAt','DESC'],['id','DESC']]});
 res.render(require('path').join(__dirname,'../views/portal/activity-logs.ejs'),{name:req.user.name,email:req.user.email,roleName:req.user.roleName,logs:rows,page,count});
}));
module.exports=router;
