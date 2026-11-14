'use strict';
const Categories=require('../models/Room'),pricing=require('../repos/PricingConfig-repo');
module.exports=async()=>{
 const [categories,specials]=await Promise.all([Categories.findAll({attributes:['_id','category_name','number_of_guests','price'],order:[['category_name','ASC']]}),pricing.findActive()]);
 return categories.map(category=>{
  const special=specials.find(row=>String(row.category_id)===String(category._id));
  return {name:category.category_name,capacity:Number(category.number_of_guests),price:Number(special?special.special_price:category.price)};
 });
};
