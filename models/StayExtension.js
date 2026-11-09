'use strict';
const {DataTypes}=require('sequelize');
module.exports=require('../config/connectDB').define('stay_extension',{
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},
 booking_id:{type:DataTypes.INTEGER,allowNull:false},reference_id:DataTypes.STRING,
 old_end:DataTypes.DATE,new_end:DataTypes.DATE,added_nights:DataTypes.INTEGER,
 additional_amount:DataTypes.DOUBLE,amount_paid_now:DataTypes.DOUBLE,
 balance_after:DataTypes.DOUBLE,credit_after:DataTypes.DOUBLE,extended_by:DataTypes.STRING
});
