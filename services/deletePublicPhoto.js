'use strict';
const db=require('../config/connectDB'),Categories=require('../models/Room'),Images=require('../models/Images'),repo=require('../repos/cloudinary');
const imageId=require('../utils/cloudinaryImageId'),photos=require('./publicPhotos'),{Op}=require('sequelize');
module.exports=async function deletePublicPhoto(url,publicId){
 const id=imageId(url);
 if(!id||(publicId&&id!==publicId))throw Error('This photo is not a supported public Cloudinary image.');
 const result=await repo.delete(id);
 if(!result||!['ok','not found'].includes(result.result))throw Error('Cloudinary could not delete this photo. Please try again.');
 try{
  await db.transaction(async transaction=>{
   const categories=await Categories.findAll({transaction,lock:transaction.LOCK.UPDATE,order:[['_id','ASC']]});
   for(const category of categories){
    const existing=category.picture||[],picture=existing.filter(photo=>photo!==url&&imageId(photo)!==id);
    if(picture.length!==existing.length)await category.update({picture},{transaction});
   }
   await Images.destroy({where:{[Op.or]:[{public_id:id},{url}]},transaction,individualHooks:true});
  });
 }finally{photos.invalidate(id);}
 return id;
};
