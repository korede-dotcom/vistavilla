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
 let options;
 try { options=require('../utils/activityFilters')(req.query); } catch(error) { return res.status(400).send(error.message); }
 const {filters,where,limit,pageUrl,actions,resources}=options;
 let page=options.page;
 let result=await Log.findAndCountAll({where,limit,offset:(page-1)*limit,order:[['createdAt','DESC'],['id','DESC']]});
 const pages=Math.max(1,Math.ceil(result.count/limit));
 if(page>pages){page=pages;result=await Log.findAndCountAll({where,limit,offset:(page-1)*limit,order:[['createdAt','DESC'],['id','DESC']]});}
 const {rows,count}=result;
 const includeViews=filters.views;
 res.render(require('path').join(__dirname,'../views/portal/activity-logs.ejs'),{name:req.user.name,email:req.user.email,roleName:req.user.roleName,logs:rows,page,count,pages,limit,pageUrl,filters,actions,resources,includeViews,describe:log=>log.description||(log.resource==='HTTP'?words.requestDescription(log.method,log.path,log.outcome==='failed'):words.description(log.action,log.resource,{},log.fields||[],log.record_id))});
}));
module.exports=router;
