'use strict';
const pricing=require('../views/js/booking-pricing');
module.exports=function staffBookingDates({start,end,allowPast,reason,now=new Date()}){
 // Validate strict calendar dates and date order before any database query.
 pricing.quote({start,end,rate:1,discountValue:0});
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(part=>part.type===type).value;
 const today=get('year')+'-'+get('month')+'-'+get('day');
 const backdated=start<today;
 if(backdated&&!(allowPast===true||allowPast==='true'||allowPast==='on'))throw Error('Enable Record past dates to create a backdated booking.');
 if(backdated&&(typeof reason!=='string'||!reason.trim()||reason.length>1000))throw Error('Enter a reason for recording past dates (up to 1,000 characters).');
 const ended=new Date(end+'T12:00:00+01:00')<=now;
 return {is_backdated:backdated,backdated_reason:backdated?reason.trim():null,ended,active:start<=today&&!ended};
};
