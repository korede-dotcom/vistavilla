'use strict';
const {Op}=require('sequelize');
const statuses=['success','confirmed','part-payment','completed'];
function windowFor(booking,now=new Date()) {
 const start=new Date(booking.start),end=new Date(booking.end);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=now||end<=start)throw Error('This booking has no remaining stay to transfer.');
 return {start:new Date(Math.max(start.getTime(),now.getTime())),end};
}
function overlap(booking,window) {
 return {id:{[Op.ne]:booking.id},status:{[Op.in]:statuses},checked_out:false,start:{[Op.lt]:window.end},end:{[Op.gt]:window.start}};
}
function retained(room,window) {
 if(!room.is_retained)return false;
 if(!room.retained_from||!room.retained_to)return true;
 return new Date(room.retained_from)<window.end&&new Date(room.retained_to)>window.start;
}
module.exports={windowFor,overlap,retained};
