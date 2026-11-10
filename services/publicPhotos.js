'use strict';
const Images=require('../models/Images'),Rooms=require('../models/RoomNumbers'),cloudinary=require('cloudinary').v2;
const {folder,allowedId,allowedUrl}=require('../utils/publicPhoto');
let cached=null,until=0,pending=null;
exports.invalidate=()=>{cached=null;until=0;};
exports.roomPhotos=async ids=>{
 const {Op}=require('sequelize');
 const rows=await Images.findAll({where:{for:'hotelroom',status:true,...(ids?{room_id:{[Op.in]:ids}}:{})},order:[['_id','DESC']]});
 return rows.filter(row=>allowedId(row.public_id)&&allowedUrl(row.url));
};
exports.gallery=async()=>{
 if(cached&&until>Date.now())return cached;if(pending)return pending;
 pending=(async()=>{
  const registered=await exports.roomPhotos();
  let resources=[];
  try{
   let cursor;
   do {
    const result=await cloudinary.api.resources({type:'upload',resource_type:'image',prefix:folder()+'/',max_results:500,timeout:5000,...(cursor?{next_cursor:cursor}:{})});
    resources.push(...result.resources);cursor=result.next_cursor;
   } while(cursor);
  }catch(error){console.warn('Public gallery folder unavailable:',error.message);}
  const items=[...registered.map(row=>({url:row.url,public_id:row.public_id,room_id:row.room_id,title:'Room photos',type:'Apartment',created_at:row.createdAt})),...resources.map(row=>({url:row.secure_url,public_id:row.public_id,title:'Vistavilla Apartments',type:'Gallery',created_at:row.created_at}))];
  const seen=new Set();cached=items.filter(item=>allowedId(item.public_id)&&allowedUrl(item.url)&&!seen.has(item.public_id)&&seen.add(item.public_id));until=Date.now()+60000;return cached;
 })();try{return await pending;}finally{pending=null;}
};
exports.attachCategories=async categories=>{
 const photos=await exports.roomPhotos();
 const rooms=await Rooms.findAll({attributes:['_id','category_id'],raw:true});const byId=new Map(rooms.map(room=>[String(room._id),String(room.category_id)]));
 return categories.map(category=>{const row=category.get?category.get({plain:true}):category.dataValues||category;
  const own=photos.filter(photo=>byId.get(String(photo.room_id))===String(row._id)).map(photo=>photo.url);
  return {...row,picture:[...new Set([...own,...(Array.isArray(row.picture)?row.picture.filter(allowedUrl):[])])]};});
};
exports.attachRooms=async rooms=>{
 const ids=rooms.map(room=>room._id);const photos=ids.length?await exports.roomPhotos(ids):[];
 return rooms.map(room=>({...((room.get?room.get({plain:true}):room.dataValues)||room),roomImages:photos.filter(photo=>String(photo.room_id)===String(room._id)).map(photo=>photo.url)}));
};
