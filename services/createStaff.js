'use strict';
const db=require('../config/connectDB'),User=require('../models/User'),Staff=require('../models/Staff');
module.exports=async function createStaff(input,password){
 return db.transaction(async transaction=>{
  const user=await User.create({name:input.first+' '+input.last,email:input.email,password,role_id:parseInt(input.role,10)},{transaction});
  if(!user._id)throw Error('Staff account was not created.');
  const staff=await Staff.create({user_id:user._id,phonenumber:input.phonenumber,address:input.address},{transaction});
  return {user,staff};
 });
};
