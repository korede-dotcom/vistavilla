'use strict';
const {Op}=require('sequelize');
const statuses=['success','confirmed','part-payment','completed'];
function day(date){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).filter(p=>p.type!=='literal').reduce((out,p)=>({...out,[p.type]:p.value}),{});}
function lagosDay(date){const p=day(date);return `${p.year}-${p.month}-${p.day}`;}
function checkoutAt(end){return new Date(lagosDay(new Date(end))+'T11:59:00+01:00');}
function windowFor(start,end){
 const normalize=value=>{if(typeof value!=='string')throw Error('Enter valid stay dates.');if(/^\d{2}-\d{2}-\d{4}$/.test(value))return value.split('-').reverse().join('-');return value;};
 const a=normalize(start),b=normalize(end);
 require('../views/js/booking-pricing').quote({start:a,end:b,rate:1,discountValue:0});
 return {start:new Date(a+'T12:00:00+01:00'),end:new Date(b+'T12:00:00+01:00'),startDay:a,endDay:b};
}
const overlap=window=>({status:{[Op.in]:statuses},checked_out:false,start:{[Op.lt]:window.end},end:{[Op.gt]:window.start}});
function overlapsDates(booking,window){return new Date(lagosDay(new Date(booking.start))+'T12:00:00+01:00')<window.end&&checkoutAt(booking.end)>window.start;}
module.exports={statuses,lagosDay,checkoutAt,windowFor,overlap,overlapsDates};
