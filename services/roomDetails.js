'use strict';
const photos=require('./publicPhotos');
module.exports=async function roomDetails(room,special){
 if(!room)return null;
 const plain=room.get?room.get({plain:true}):room.dataValues||room;
 const category=plain.roomcategory||plain.Room;
 if(!category)return null;
 const [categoryRows,images]=await Promise.all([photos.attachCategories([category]),photos.roomPhotos([plain._id])]);
 const data=categoryRows[0];if(!data)return null;
 const ownCategoryPhotos=Array.isArray(category.picture)?category.picture.filter(require('../utils/publicPhoto').allowedUrl):[];
 const categoryPictures=[...new Set([...ownCategoryPhotos,...(data.picture||[])])];
 const pricing=special&&(special.dataValues||special);
 return {...plain,roomImages:images.map(image=>image.url),roomcategory:{...data,picture:categoryPictures,hasSpecialPrice:Boolean(pricing),...(pricing?{originalPrice:data.price,price:Number(pricing.special_price),pricingEndDate:pricing.end_date}:{})}};
};
