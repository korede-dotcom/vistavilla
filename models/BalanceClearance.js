'use strict';
const {DataTypes}=require('sequelize');
module.exports=require('../config/connectDB').define('balance_clearance',{
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
 booking_id:{type:DataTypes.INTEGER,allowNull:false},
 part_payment_id:{type:DataTypes.INTEGER,allowNull:false},
 reference_id:{type:DataTypes.STRING,allowNull:false},
 guest_name:DataTypes.STRING,room_number:DataTypes.STRING,
 amount:{type:DataTypes.DOUBLE,allowNull:false},
 old_total:DataTypes.DOUBLE,new_total:DataTypes.DOUBLE,
 reason:{type:DataTypes.TEXT,allowNull:false},
 cleared_by:DataTypes.STRING,cleared_by_name:DataTypes.STRING,cleared_by_role:DataTypes.STRING
},{updatedAt:false});
