'use strict';
const {DataTypes}=require('sequelize');
module.exports=require('../config/connectDB').define('booking_revision',{
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
 booking_id:{type:DataTypes.INTEGER,allowNull:false},reference_id:DataTypes.STRING,
 edited_by:DataTypes.STRING,editor_id:DataTypes.STRING,reason:DataTypes.TEXT,
 before:DataTypes.JSON,after:DataTypes.JSON,guest_fields_changed:DataTypes.JSON,
 amount_paid_now:DataTypes.DOUBLE
},{updatedAt:false});
