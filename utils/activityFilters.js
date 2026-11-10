'use strict';
const {Op}=require('sequelize');
const actions=['create','create_many','update','update_many','delete','delete_many','view','request'];
const resources=['hotelbooking','booking_revision','roomtransfer','stay_extension','expense','damage','paymenthistory','partpayment','roomnumber','roomcategory','user','staff','pricingconfig','marque','hotel_setting','HTTP'];
function date(value){if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Enter valid filter dates.');return new Date(value+'T00:00:00+01:00');}
module.exports=function activityFilters(query){
 const text=value=>typeof value==='string'?value.trim():'';
 const filters={q:text(query.q).slice(0,150),actor:text(query.actor).slice(0,100),action:actions.includes(query.action)?query.action:'',resource:resources.includes(query.resource)?query.resource:'',outcome:['success','failed'].includes(query.outcome)?query.outcome:'',start:text(query.start),end:text(query.end),views:query.views==='1',size:[10,25,50,100].includes(Number(query.size))?Number(query.size):25};
 const terms=[];
 if(!filters.views)terms.push({[Op.or]:[{resource:{[Op.ne]:'HTTP'}},{outcome:'failed'}]});
 const like=value=>'%'+value.replace(/[\\%_]/g,'\\$&')+'%';
 if(filters.q)terms.push({[Op.or]:['description','actor_name','record_id','resource','path'].map(field=>({[field]:{[Op.iLike]:like(filters.q)}}))});
 if(filters.actor)terms.push({actor_name:{[Op.iLike]:like(filters.actor)}});
 if(filters.action)terms.push({action:filters.action});if(filters.resource)terms.push({resource:filters.resource});
 if(filters.outcome)terms.push({outcome:filters.outcome==='failed'?'failed':{[Op.ne]:'failed'}});
 const start=date(filters.start),end=date(filters.end);
 if(start&&end&&start>end)throw Error('Filter end date must be on or after start date.');
 if(start||end)terms.push({createdAt:{...(start?{[Op.gte]:start}:{}),...(end?{[Op.lt]:new Date(end.getTime()+86400000)}:{})}});
 const page=Math.max(1,Math.min(100000,parseInt(query.page,10)||1));
 function pageUrl(number){const params=new URLSearchParams();for(const [key,value]of Object.entries(filters)){if(key==='views'){if(value)params.set('views','1');}else if(value!==''&&value!==false)params.set(key,String(value));}params.set('page',String(number));return '?'+params.toString();}
 return {filters,where:terms.length?{[Op.and]:terms}:{},page,limit:filters.size,pageUrl,actions,resources};
};
