'use strict';
const router=require('express').Router();
const asyncHandler=require('express-async-handler');
const auth=require('../middleware/checkAuthCookie');
const User=require('../models/User');
const Log=require('../models/ActivityLog');
const {Op}=require('sequelize');
const words=require('../utils/activityDescription');
router.get('/',auth,asyncHandler(async(req,res)=>{
 const user=await User.findByPk(req.user._id);
 if(!user||!['ceo','hotelmanager'].includes(user.roleName))return res.status(403).send('CEO or hotel manager access required.');
 res.set('Cache-Control','no-store');
 const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
 const includeViews=req.query.views==='1';
 const where=includeViews?{}:{[Op.or]:[{resource:{[Op.ne]:'HTTP'}},{outcome:'failed'}]};
 const {rows,count}=await Log.findAndCountAll({where,limit:50,offset:(page-1)*50,order:[['createdAt','DESC'],['id','DESC']]});
 res.render(require('path').join(__dirname,'../views/portal/activity-logs.ejs'),{name:req.user.name,email:req.user.email,roleName:req.user.roleName,logs:rows,page,count,includeViews,describe:log=>log.description||(log.resource==='HTTP'?words.requestDescription(log.method,log.path,log.outcome==='failed'):words.description(log.action,log.resource,{},log.fields||[],log.record_id))});
}));
module.exports=router;
